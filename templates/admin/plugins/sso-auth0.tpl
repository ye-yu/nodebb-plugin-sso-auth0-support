<div class="row">
	<div class="col-sm-2 col-xs-12 settings-header">GitHub SSO</div>
	<div class="col-sm-10 col-xs-12">
		<div class="alert alert-info">
			<p>
				Register a new <strong>Auth0 Application</strong> via your
				<a href="https://manage.auth0.com/dashboard">Auth0 Dashboard</a> and then paste
				your application details here.
			</p>
		</div>
		<form class="sso-auth0-settings">
			<div class="form-group">
				<label for="domain">Client Domain</label>
				<input type="text" name="domain" title="Client Domain" class="form-control" placeholder="Client Domain">
			</div>
			<div class="form-group">
				<label for="id">Client ID</label>
				<input type="text" name="id" title="Client ID" class="form-control" placeholder="Client ID">
			</div>
			<div class="form-group">
				<label for="secret">Client Secret</label>
				<input type="text" name="secret" title="Client Secret" class="form-control" placeholder="Client Secret" />
			</div>
			<div class="form-group alert alert-warning">
				<label for="callback">Your NodeBB&apos;s "Authorization callback URL"</label>
				<input type="text" id="callback" title="Authorization callback URL" class="form-control" value="{callbackURL}" readonly />
			</div>
			<p>
				Ensure that this value is set in your Auth0 application&apos;s settings
			</p>
			<div class="checkbox">
				<label for="disableRegistration" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="disableRegistration" name="disableRegistration" />
					<span class="mdl-switch__label">Disable user registration via SSO</span>
				</label>
			</div>
			<p class="help-block">
				Restricting registration means that only registered users can associate their account with this SSO strategy.
				This restriction is useful if you have users bypassing registration controls by using social media accounts, or
				if you wish to use the NodeBB registration queue.
			</p>

			<div class="checkbox">
				<label for="autoAuth0Login" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="autoAuth0Login" name="autoAuth0Login" />
					<span class="mdl-switch__label">Automatically login to Auth0</span>
				</label>
			</div>
			<p class="help-block">
				With this enabled, NodeBB will always redirect user to the Auth0 login page if they are not authenticated.
			</p>
		</form>
	</div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>