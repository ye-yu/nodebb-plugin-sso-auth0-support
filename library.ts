import got from "got";
import { Auth0Plugin, Database, HostHelpers, PassportCallback, User } from "./library.types";

(function (module: NodeModule) {

  const User: User = require.main!.require('./src/user');
  const db: Database = require.main!.require('./src/database');
  const groups = require.main!.require('./src/groups');
  const nconf = require.main!.require('nconf');
  const passport = require.main!.require('passport');
  const winston = require.main!.require('winston');
  const Auth0Strategy = require('passport-auth0');
  const meta = require.main!.require('./src/meta');

  async function metaSettingsGet<T = any>(key: string) {
    return new Promise<T>((res, rej) => meta.settings.get(key, (err: any, data: T) => err ? rej(err) : res(data)))
  }

  var constants = Object.freeze({
    'name': "Auth0 - Support Ver.",
    'admin': {
      'icon': 'fa-star',
      'route': '/plugins/sso-auth0'
    }
  });

  async function onManagementToken<T>(settings: Auth0Plugin["settings"], fn: (token: string) => Promise<T>, accessToken: false | string = false): Promise<T> {
    try {
      const token = accessToken || await db.getObjectField("auth0-management", "token")
      return await fn(token)
    } catch (err) {
      if (accessToken) throw err;
      else {
        const { body } = await got.get<{ access_token: string }>(new URL("/oauth/token", `https://${settings?.domain}`), {
          json: {
            client_id: settings?.id,
            client_secret: settings?.secret,
            audience: settings?.audience,
            grant_type: "client_credentials",
          },
          responseType: 'json'
        })

        const { access_token } = body
        await db.setObjectField("auth0-management", "token", access_token)
        return await onManagementToken(settings, fn, access_token)
      }
    }
  }

  async function checkAuth0AdminRights(userId: string | number, auth0Id: string, settings: Auth0Plugin["settings"]) {
    if (userId === 1 || userId === 0) return;
    winston.verbose("Requesting roles for auth0Id: %s", auth0Id)
    const { body: roles } = await onManagementToken(settings, token => got.get<{
      id: string
      name: string
      description: string
    }[]>(new URL(`/api/v2/users/${auth0Id}/roles`, `https://${settings?.domain}`), {
      responseType: 'json',
      headers: {
        Authorization: "Bearer " + token
      }
    }))
    winston.verbose("Got roles for auth0Id %s: %s", auth0Id, roles)
    const hasSuperAdminRole = roles.find(e => e.id === settings?.superadminRoleId)
    if (hasSuperAdminRole) await groups.join("administrators", userId);
    else await groups.leave("administrators", userId);
  }

  const Auth0: Auth0Plugin = {
    async getStrategy(strategies, callback) {
      try {
        const settings = await metaSettingsGet<Auth0Plugin["settings"]>("sso-auth0") || {
          domain: "",
          id: "",
          secret: "",
          audience: "",
          superadminRoleId: "",
          autoAuth0Login: "",
          disableRegistration: "",
          displayAssociation: "",
          preventDeletion: "",
        }
        Auth0.settings = settings
        winston.verbose("Using Auth0 settings:", Auth0.settings)

        if (settings.id && settings.secret) {
          passport.use(new Auth0Strategy({
            domain: settings.domain,
            clientID: settings.id,
            clientSecret: settings.secret,
            callbackURL: nconf.get('url') + '/auth/auth0/callback',
            passReqToCallback: true,
            state: true,
            scope: 'openid email profile',
          }, <PassportCallback>async function (req, accessToken, refreshToken, extraParams, profile, done) {
            try {
              winston.verbose("Login info: %s", JSON.stringify({
                accessToken,
                refreshToken,
                extraParams,
                user: req.user
              }, null, 2))

              let parseResult: { uid: string };

              if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
                // Update Auth0 -specific information to the user
                // check role here too
                await Promise.all([
                  User.setUserField(req.user.uid, 'auth0id', profile.id),
                  db.setObjectField('auth0id:uid', profile.id, req.user.uid),
                ])

                parseResult = req.user
              } else {
                var email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';
                const uidInfo = await Auth0.login(profile.id, profile.displayName, email, profile.picture);
                if (settings.audience && settings.superadminRoleId) {
                  await checkAuth0AdminRights(req.user.uid, profile.id, settings)
                }
                parseResult = uidInfo
              }
              if (settings.audience && settings.superadminRoleId) {
                await checkAuth0AdminRights(req.user.uid, profile.id, settings)
              }
              done(null, parseResult)
            } catch (err) {
              winston.error("Error on Auth0 passport: %s", err)
              done(new Error('[[error:sso-login-error, Auth0]]'))
            }
          }));

          strategies.push({
            name: 'auth0',
            url: '/auth/auth0',
            callbackURL: '/auth/auth0/callback',
            icon: constants.admin.icon,
            scope: 'openid email profile',
            checkState: false, 	// this is ok because nodebb core passes state through in .authenticate()
          });
        }
        callback(null, strategies);
      } catch (err) {
        callback(err, strategies);
      }
    },

    appendUserHashWhitelist(data, callback) {
      const { whitelist } = data
      if (whitelist.indexOf("auth0id") < 0) {
        whitelist.push("auth0id")
      }
      return callback(null, data);
    },

    async getAssociation(data, callback) {
      try {
        const auth0id = await User.getUserField(data.uid, "auth0id")
        if (Auth0.settings && Auth0.settings.displayAssociation == "on") {
          if (auth0id) {
            data.associations.push({
              associated: true,
              name: constants.name,
              icon: constants.admin.icon,
              deauthUrl: nconf.get('url') + '/deauth/auth0',
            });
          } else {
            data.associations.push({
              associated: false,
              url: nconf.get('url') + '/auth/auth0',
              name: constants.name,
              icon: constants.admin.icon
            });
          }
        }
        callback(null, data);
      } catch (err) {
        return callback(err, data);
      }
    },

    async login(auth0Id, username, email, picture) {
      if (!Auth0.settings) throw new Error('[[error:sso-plugin-not-yet-loaded, Auth0]]')
      // for auth0 app that does not implement username in login credetials
      if (username === email) {
        username = email.split("@")[0];
      }
      // TODO: Check if role is superadmin
      const uid: string | undefined = await Auth0.getUidByAuth0ID(auth0Id)
      if (uid) return { uid }
      else {
        // New User
        const postRegistration = async function (uid: string) {
          // trust email returned from Auth0
          await Promise.all([
            User.setUserField(uid, 'email:confirmed', 1),
            db.sortedSetRemove('users:notvalidated', uid),
            User.setUserField(uid, 'auth0id', auth0Id),
            User.setUserField(uid, 'uploadedpicture', picture),
            User.setUserField(uid, 'picture', picture),
            db.setObjectField('auth0id:uid', auth0Id, uid)
          ])
        };

        const uid = await User.getUidByEmail(email)
        if (!uid) {
          // Abort user creation if registration via SSO is restricted
          if (Auth0.settings.disableRegistration === 'on') throw new Error('[[error:sso-registration-disabled, Auth0]]')
          const newUid = await User.create({ username: username, email: email })
          await postRegistration(newUid);
          return {
            uid: newUid
          }
        } else {
          await postRegistration(uid); // Existing account -- merge
          return { uid }
        }
      }
    },

    getUidByAuth0ID: (auth0Id) => db.getObjectField('auth0id:uid', auth0Id),

    addMenuItem(custom_header, callback) {
      custom_header.authentication.push({
        "route": constants.admin.route,
        "icon": constants.admin.icon,
        "name": constants.name
      });

      callback(null, custom_header);
    },

    init(data, callback) {
      var hostHelpers: HostHelpers = require.main!.require('./src/routes/helpers');

      const renderAdmin: import("express").RequestHandler = (_req, res) => res.render('admin/plugins/sso-auth0', {
        callbackURL: nconf.get('url') + '/auth/auth0/callback'
      });

      data.router.get('/admin/plugins/sso-auth0', data.middleware.admin.buildHeader, renderAdmin);
      data.router.get('/api/admin/plugins/sso-auth0', renderAdmin);

      hostHelpers.setupPageRoute(data.router, '/deauth/auth0', data.middleware, [data.middleware.requireUser], <import("express").RequestHandler>function (_, res) {
        res.render('plugins/sso-auth0/deauth', {
          service: "Auth0",
        });
      });
      data.router.post('/deauth/auth0', [data.middleware.requireUser, data.middleware.applyCSRF], <import("express").RequestHandler>async function (req, res, next) {
        try {
          await Auth0.deleteUserData({ uid: (req as any).user.uid })
        } catch (err) {
          if (err) return next(err);
          res.redirect(nconf.get('relative_path') + '/me/edit');
        }
      });
      callback();
    },

    async deleteUserData() {
      // TODO: allow account deletion based on settings
      throw new Error("Deleting account is not allowed.")
    },

    authenticateUserPage({ req, res }) {
      if (
        req.path !== "/login"
        && Auth0.settings
        && Auth0.settings.autoAuth0Login === "on"
      ) res.redirect(nconf.get("url") + "/auth/auth0")
    }
  }

  module.exports = Auth0;
}(module));
