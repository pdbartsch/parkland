from flask import render_template, url_for, flash, redirect, request, session, current_app
from parklandapp.auth import auth
from authlib.integrations.flask_client import OAuth

@auth.route("/login")
def login():
    oauth = current_app.extensions['authlib.integrations.flask_client']
    redirect_uri = url_for('auth.authorize', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth.route("/auth/callback")
def authorize():
    oauth = current_app.extensions['authlib.integrations.flask_client']
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.userinfo()
    
    if user_info:
        email = user_info.get('email')
        if email in current_app.config['ALLOWED_USERS']:
            session['user'] = user_info
            flash(f'Successfully logged in as {email}!', 'success')
            return redirect(url_for('main.home'))
        else:
            flash('Access denied: You are not on the allowlist.', 'danger')
            return redirect(url_for('main.home'))
    
    flash('Authentication failed.', 'danger')
    return redirect(url_for('main.home'))

@auth.route("/logout")
def logout():
    session.pop('user', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('main.home'))

@auth.route("/login_dev")
def login_dev():
    if not current_app.debug:
        flash('Dev login only available in debug mode.', 'danger')
        return redirect(url_for('main.home'))
    
    # Mock user
    session['user'] = {
        'email': 'dev@example.com',
        'name': 'Dev User',
        'picture': ''
    }
    flash('Logged in as Dev User!', 'success')
    return redirect(url_for('main.home'))
