type Strategies = {
  name: string
  url: string
  callbackURL: string
  icon: string
  scope: string
  checkState: boolean
}

type Settings = {
  domain: string
  id: string
  secret: string
  audience: string
  superadminRoleId: string
  autoAuth0Login: string
  disableRegistration: string
  displayAssociation: string
  preventDeletion: string
  disableGDPR: string
  [any: string]: string
}

type WhitelistInfo = {
  whitelist: string[]
}

type Callback<T = any> = (err: null | Error, data?: T) => void

export type PassportCallback = (req: any, token: string, _: string, __: string, profile: { id: string, emails?: { value:string }[], displayName: string, picture: string }, done: Callback) => void

type UserAssociations = {
  uid: string,
  associations: {
    associated: boolean,
    name: string,
    icon: string,
    deauthUrl?: string,
    url?: string,
  }[]
}

type CreateUserData = {
  username: string
  email: string
  timestamp?: number
}

type AsyncVoid = Promise<void>
type SyncVoid = void
type CustomHeaders = {
  authentication: {
    route: string
    icon: string
    name: string
  }[]
}

type Router = import("express").Router
type RequestHandler = import("express").RequestHandler | import("express").ErrorRequestHandler


type PluginData = {
  router: Router
  middleware: {
    admin: {
      [key: string]: RequestHandler
    }
    requireUser: RequestHandler
    applyCSRF: RequestHandler
  }
}

export interface Auth0Plugin {
  getStrategy(strategies: Strategies[], callback: Callback<Strategies[]>): AsyncVoid
  appendUserHashWhitelist(data: WhitelistInfo, callback: Callback<WhitelistInfo>): SyncVoid
  getAssociation(user: UserAssociations, callback: Callback<UserAssociations>): AsyncVoid
  login(auth0Id: string, username: string, email: string, picture: string): Promise<{uid:string}>
  getUidByAuth0ID(auth0Id: string): Promise<string>
  addMenuItem(custom_header: CustomHeaders, callback: Callback<CustomHeaders>): SyncVoid
  init(data: PluginData, callback: () => void): SyncVoid
  deleteUserData(data: {uid?:string}): Promise<void>
  authenticateUserPage(data: {req: import("express").Request, res: import("express").Response}): void
  settings?: Settings
}

export interface User {
  getUserField<T extends keyof UserDB>(uid: string | number, key: T): Promise<UserDB[T]>
  setUserField<T extends keyof UserDB>(uid: string | number, key: T, value: UserDB[T]): Promise<void>
  getUidByEmail(email: string): Promise<string | undefined>
  create(data: CreateUserData): Promise<string>
}

export interface Database {
  sortedSetRemove(key: string, uid: string | string[]): Promise<void>
  setObjectField(object: string, key: string, value: any): Promise<void>
  getObjectField(object: string, key: string): Promise<string>
}

export interface UserDB {
  auth0id?: string
  'email:confirmed'?: number
  'uploadedpicture': string
  'picture'?: string
}

export interface HostHelpers {
  setupPageRoute(router: Router, path: string, ...middlewares: (PluginData["middleware"] | RequestHandler | RequestHandler[])[]): void
}
