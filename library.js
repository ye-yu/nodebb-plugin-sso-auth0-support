(function(module) {
	"use strict";

	var User = require.main.require('./src/user');
	var db = require.main.require('./src/database');
	var meta = require.main.require('./src/meta');
	var nconf = require.main.require('nconf');
	var passport = require.main.require('passport');
	var Auth0Strategy = require('passport-auth0');

	var constants = Object.freeze({
		'name': "Auth0 - Support Ver.",
		'admin': {
			'icon': 'fa-star',
			'route': '/plugins/sso-auth0'
		}
	});

	var Auth0 = {};

	Auth0.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-auth0', function(err, settings) {
			Auth0.settings = settings;

			if (!err && settings.id && settings.secret) {
				passport.use(new Auth0Strategy({
					domain: settings.domain,
					clientID: settings.id,
					clientSecret: settings.secret,
					callbackURL: nconf.get('url') + '/auth/auth0/callback',
					passReqToCallback: true,
					state: false,	// this is ok because nodebb core passes state through in .authenticate()
					scope: 'openid email profile',
				}, function(req, token, unused, unused2, profile, done) {
					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
						// Save Auth0 -specific information to the user
						User.setUserField(req.user.uid, 'auth0id', profile.id);
						db.setObjectField('auth0id:uid', profile.id, req.user.uid);
						return done(null, req.user);
					}

					var email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';
					Auth0.login(profile.id, profile.displayName, email, profile.picture, done);
				}));

				strategies.push({
					name: 'auth0',
					url: '/auth/auth0',
					callbackURL: '/auth/auth0/callback',
					icon: constants.admin.icon,
					scope: 'openid email profile'
				});
			}

			callback(null, strategies);
		});
	};

	Auth0.appendUserHashWhitelist = function (data, callback) {
		data.whitelist.push('auth0id');
		return setImmediate(callback, null, data);
	};

	Auth0.getAssociation = function(data, callback) {
		User.getUserField(data.uid, 'auth0id', function(err, auth0id) {
			if (err) {
				return callback(err, data);
			}

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

			callback(null, data);
		})
	};

	Auth0.login = function(auth0Id, username, email, picture, callback) {
		// for auth0 app that does not implement username in login credetials
		if (username === email) {
			username = email.split("@")[0];
		}

		Auth0.getUidByAuth0ID(auth0Id, function(err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				var success = function(uid) {
					// trust email returned from Auth0
					User.setUserField(uid, 'email:confirmed', 1);
					db.sortedSetRemove('users:notvalidated', uid);

					User.setUserField(uid, 'auth0id', auth0Id);

					// set profile picture
					User.setUserField(uid, 'uploadedpicture', picture);
					User.setUserField(uid, 'picture', picture);

					db.setObjectField('auth0id:uid', auth0Id, uid);
					callback(null, {
						uid: uid
					});
				};

				User.getUidByEmail(email, function(err, uid) {
					if (!uid) {
						// Abort user creation if registration via SSO is restricted
						if (Auth0.settings.disableRegistration === 'on') {
							return callback(new Error('[[error:sso-registration-disabled, Auth0]]'));
						}

						User.create({username: username, email: email}, function(err, uid) {
							if (err !== null) {
								callback(err);
							} else {
								success(uid);
							}
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	};

	Auth0.getUidByAuth0ID = function(auth0Id, callback) {
		db.getObjectField('auth0id:uid', auth0Id, function(err, uid) {
			if (err) {
				callback(err);
			} else {
				callback(null, uid);
			}
		});
	};

	Auth0.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};

	Auth0.init = function(data, callback) {
		var hostHelpers = require.main.require('./src/routes/helpers');

		function renderAdmin(req, res) {
			res.render('admin/plugins/sso-auth0', {
				callbackURL: nconf.get('url') + '/auth/auth0/callback'
			});
		}

		data.router.get('/admin/plugins/sso-auth0', data.middleware.admin.buildHeader, renderAdmin);
		data.router.get('/api/admin/plugins/sso-auth0', renderAdmin);

		hostHelpers.setupPageRoute(data.router, '/deauth/auth0', data.middleware, [data.middleware.requireUser], function (req, res) {
			res.render('plugins/sso-auth0/deauth', {
				service: "Auth0",
			});
		});
		data.router.post('/deauth/auth0', [data.middleware.requireUser, data.middleware.applyCSRF], function (req, res, next) {
			Auth0.deleteUserData({
				uid: req.user.uid,
			}, function (err) {
				if (err) {
					return next(err);
				}

				res.redirect(nconf.get('relative_path') + '/me/edit');
			});
		});

		callback();
	};

	Auth0.deleteUserData = function(data, callback) {
		callback(new Error("Deleting account is not allowed."));
	};

	module.exports = Auth0;
}(module));
