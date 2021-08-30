"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
(function (module) {
    var User = require.main.require('./src/user');
    var db = require.main.require('./src/database');
    var nconf = require.main.require('nconf');
    var passport = require.main.require('passport');
    var winston = require.main.require('winston');
    var Auth0Strategy = require('passport-auth0');
    var meta = require.main.require('./src/meta');
    function metaSettingsGet(key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (res, rej) { return meta.settings.get(key, function (err, data) { return err ? rej(err) : res(data); }); })];
            });
        });
    }
    var constants = Object.freeze({
        'name': "Auth0 - Support Ver.",
        'admin': {
            'icon': 'fa-star',
            'route': '/plugins/sso-auth0'
        }
    });
    var Auth0 = {
        getStrategy: function (strategies, callback) {
            return __awaiter(this, void 0, void 0, function () {
                var settings, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, metaSettingsGet("sso-auth0")];
                        case 1:
                            settings = (_a.sent()) || {
                                domain: "",
                                id: "",
                                secret: "",
                                superadminRoleId: "",
                                autoAuth0Login: "",
                                disableRegistration: "",
                                displayAssociation: "",
                                preventDeletion: ""
                            };
                            Auth0.settings = settings;
                            winston.verbose("Using Auth0 settings:", Auth0.settings);
                            if (settings.id && settings.secret) {
                                passport.use(new Auth0Strategy({
                                    domain: settings.domain,
                                    clientID: settings.id,
                                    clientSecret: settings.secret,
                                    callbackURL: nconf.get('url') + '/auth/auth0/callback',
                                    passReqToCallback: true,
                                    state: false,
                                    scope: 'openid email profile'
                                }, function (req, accessToken, refreshToken, extraParams, profile, done) {
                                    return __awaiter(this, void 0, void 0, function () {
                                        var email, uidInfo;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    winston.verbose({
                                                        accessToken: accessToken,
                                                        refreshToken: refreshToken,
                                                        extraParams: extraParams
                                                    });
                                                    if (!(req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0)) return [3 /*break*/, 3];
                                                    // Save Auth0 -specific information to the user
                                                    return [4 /*yield*/, Promise.all([
                                                            User.setUserField(req.user.uid, 'auth0id', profile.id),
                                                            db.setObjectField('auth0id:uid', profile.id, req.user.uid),
                                                        ])];
                                                case 1:
                                                    // Save Auth0 -specific information to the user
                                                    _a.sent();
                                                    email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';
                                                    return [4 /*yield*/, Auth0.login(profile.id, profile.displayName, email, profile.picture)];
                                                case 2:
                                                    uidInfo = _a.sent();
                                                    done(null, uidInfo);
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    done(new Error('[[error:sso-auth0-login-failed, Auth0]]'));
                                                    _a.label = 4;
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    });
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
                            return [3 /*break*/, 3];
                        case 2:
                            err_1 = _a.sent();
                            callback(err_1, strategies);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        appendUserHashWhitelist: function (data, callback) {
            var whitelist = data.whitelist;
            if (whitelist.indexOf("auth0id") < 0) {
                whitelist.push("auth0id");
            }
            return callback(null, data);
        },
        getAssociation: function (data, callback) {
            return __awaiter(this, void 0, void 0, function () {
                var auth0id, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, User.getUserField(data.uid, "auth0id")];
                        case 1:
                            auth0id = _a.sent();
                            if (Auth0.settings && Auth0.settings.displayAssociation == "on") {
                                if (auth0id) {
                                    data.associations.push({
                                        associated: true,
                                        name: constants.name,
                                        icon: constants.admin.icon,
                                        deauthUrl: nconf.get('url') + '/deauth/auth0'
                                    });
                                }
                                else {
                                    data.associations.push({
                                        associated: false,
                                        url: nconf.get('url') + '/auth/auth0',
                                        name: constants.name,
                                        icon: constants.admin.icon
                                    });
                                }
                            }
                            callback(null, data);
                            return [3 /*break*/, 3];
                        case 2:
                            err_2 = _a.sent();
                            return [2 /*return*/, callback(err_2, data)];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        login: function (auth0Id, username, email, picture) {
            return __awaiter(this, void 0, void 0, function () {
                var uid, postRegistration, uid_1, newUid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!Auth0.settings)
                                throw new Error('[[error:sso-plugin-not-yet-loaded, Auth0]]');
                            // for auth0 app that does not implement username in login credetials
                            if (username === email) {
                                username = email.split("@")[0];
                            }
                            return [4 /*yield*/, Auth0.getUidByAuth0ID(auth0Id)];
                        case 1:
                            uid = _a.sent();
                            if (!uid) return [3 /*break*/, 2];
                            return [2 /*return*/, { uid: uid }];
                        case 2:
                            postRegistration = function (uid) {
                                return __awaiter(this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: 
                                            // trust email returned from Auth0
                                            return [4 /*yield*/, Promise.all([
                                                    User.setUserField(uid, 'email:confirmed', 1),
                                                    db.sortedSetRemove('users:notvalidated', uid),
                                                    User.setUserField(uid, 'auth0id', auth0Id),
                                                    User.setUserField(uid, 'uploadedpicture', picture),
                                                    User.setUserField(uid, 'picture', picture),
                                                    db.setObjectField('auth0id:uid', auth0Id, uid)
                                                ])];
                                            case 1:
                                                // trust email returned from Auth0
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            };
                            return [4 /*yield*/, User.getUidByEmail(email)];
                        case 3:
                            uid_1 = _a.sent();
                            if (!!uid_1) return [3 /*break*/, 6];
                            // Abort user creation if registration via SSO is restricted
                            if (Auth0.settings.disableRegistration === 'on')
                                throw new Error('[[error:sso-registration-disabled, Auth0]]');
                            return [4 /*yield*/, User.create({ username: username, email: email })];
                        case 4:
                            newUid = _a.sent();
                            return [4 /*yield*/, postRegistration(newUid)];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, {
                                    uid: newUid
                                }];
                        case 6: return [4 /*yield*/, postRegistration(uid_1)];
                        case 7:
                            _a.sent(); // Existing account -- merge
                            return [2 /*return*/, { uid: uid_1 }];
                    }
                });
            });
        },
        getUidByAuth0ID: function (auth0Id) { return db.getObjectField('auth0id:uid', auth0Id); },
        addMenuItem: function (custom_header, callback) {
            custom_header.authentication.push({
                "route": constants.admin.route,
                "icon": constants.admin.icon,
                "name": constants.name
            });
            callback(null, custom_header);
        },
        init: function (data, callback) {
            var hostHelpers = require.main.require('./src/routes/helpers');
            var renderAdmin = function (_req, res) { return res.render('admin/plugins/sso-auth0', {
                callbackURL: nconf.get('url') + '/auth/auth0/callback'
            }); };
            data.router.get('/admin/plugins/sso-auth0', data.middleware.admin.buildHeader, renderAdmin);
            data.router.get('/api/admin/plugins/sso-auth0', renderAdmin);
            hostHelpers.setupPageRoute(data.router, '/deauth/auth0', data.middleware, [data.middleware.requireUser], function (_, res) {
                res.render('plugins/sso-auth0/deauth', {
                    service: "Auth0"
                });
            });
            data.router.post('/deauth/auth0', [data.middleware.requireUser, data.middleware.applyCSRF], function (req, res, next) {
                return __awaiter(this, void 0, void 0, function () {
                    var err_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, Auth0.deleteUserData({ uid: req.user.uid })];
                            case 1:
                                _a.sent();
                                callback();
                                return [3 /*break*/, 3];
                            case 2:
                                err_3 = _a.sent();
                                if (err_3)
                                    return [2 /*return*/, next(err_3)];
                                res.redirect(nconf.get('relative_path') + '/me/edit');
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
        },
        deleteUserData: function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // TODO: allow account deletion based on settings
                    throw new Error("Deleting account is not allowed.");
                });
            });
        },
        authenticateUserPage: function (_a) {
            var res = _a.res;
            if (Auth0.settings && Auth0.settings.autoAuth0Login === "on")
                res.redirect(nconf.get("url") + "/auth/auth0");
        }
    };
    module.exports = Auth0;
}(module));
