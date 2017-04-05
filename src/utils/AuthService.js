import axios from 'axios'
import { EventEmitter } from 'events'
import { isTokenExpired } from './jwtHelper'
import Auth0Lock from 'auth0-lock'
import { browserHistory } from 'react-router'

export default class AuthService extends EventEmitter {
  constructor(clientId, domain) {
    super()
    // Configure Auth0
    this.lock = new Auth0Lock(clientId, domain, {
      auth: {
        redirectUrl: `${window.location.origin}/login`,
        responseType: 'token'
      },
      // usernameStyle: 'username',
      prefill: {
        email: "someone@auth0.com", 
        username: "someone"
      }
    })
    // Add callback for lock `authenticated` event
    this.lock.on('authenticated', this._doAuthentication.bind(this))
    // Add callback for lock `authorization_error` event
    this.lock.on('authorization_error', this._authorizationError.bind(this))
    // binds login functions to keep this context
    this.login = this.login.bind(this)
  }

  _doAuthentication(authResult){
    // Saves the user token
    this.setToken(authResult.idToken)
    // navigate to the home route
    browserHistory.replace('/home')
    // Async loads the user profile data
    this.lock.getProfile(authResult.idToken, (error, profile) => {
      if (error) {
        console.log('Error loading the Profile', error)
      } else {
        this.setProfile(profile)
      }
    })
  }

  _authorizationError(error){
    // Unexpected authentication error
    console.log('Authentication Error', error)
  }

  login() {
    // Call the show method to display the widget.
    this.lock.show()
  }


// {"email":"triyuga@gmail.com","email_verified":true,"name":"Tim Marwick","given_name":"Tim","family_name":"Marwick","picture":"https://lh5.googleusercontent.com/-M7NCCJZCWhs/AAAAAAAAAAI/AAAAAAAACCA/pUHcrNVMiM0/photo.jpg","gender":"male","locale":"en","clientID":"vOnLrGLleYeZ3jNBTfIBxBIUBuM3Mv5D","updated_at":"2017-04-04T04:34:37.445Z","user_id":"google-oauth2|104267594889982092505","nickname":"triyuga","identities":[{"provider":"google-oauth2","user_id":"104267594889982092505","connection":"google-oauth2","isSocial":true}],"created_at":"2017-02-23T10:50:14.000Z","global_client_id":"NVz08gFJDmREH8bzxOwAI05RQH1tASAe", "app_metadata":{"roles":["admin"]}}
// "app_metadata":{"roles":["admin"]}
  loggedIn() {
    // Checks if there is a saved token and it's still valid
    const token = this.getToken()
    return !!token && !isTokenExpired(token)
  }

  isAdmin() {
    // Checks if user have `admin` role
    const profile = this.getProfile();
    // roles is an array in profile.app_metadata.
    const { roles } = profile.app_metadata || {};
    // Check for value 'admin' in 'roles' array.
    return !!roles && roles.indexOf('admin') > -1;
  }

  setProfile(profile) {
    // Saves profile data to localStorage
    localStorage.setItem('profile', JSON.stringify(profile))
    // Triggers profile_updated event to update the UI
    this.emit('profile_updated', profile)
  }

  getProfile() {
    // Retrieves the profile data from localStorage
    const profile = localStorage.getItem('profile')
    // console.log('profile', profile)
    return profile ? JSON.parse(localStorage.profile) : {}
  }

  setToken(idToken) {
    // Saves user token to localStorage
    localStorage.setItem('id_token', idToken)
  }

  getToken() {
    // Retrieves the user token from localStorage
    return localStorage.getItem('id_token')
  }

  logout() {
    // Clear user token and profile data from localStorage
    localStorage.removeItem('id_token');
    localStorage.removeItem('profile');
  }

  _checkStatus(response) {
    // raises an error in case response status is not a success
    if (response.status >= 200 && response.status < 300) {
      console.log('_checkStatus = Granted: response', response)
      return response
    } else {
      var error = new Error(response.statusText)
      console.log('_checkStatus = Denied: response', response)
      error.response = response
      throw error
    }
  }

  fetch(url, options){
    // performs api calls sending the required authentication headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    if (this.loggedIn()) {
      headers['Authorization'] = 'Bearer ' + this.getToken()
    }

    console.log('headers[Authorization]', headers['Authorization']);

    return fetch(url, {
      headers,
      ...options
    })
    .then(this._checkStatus)
    .then(response => response.json())
  }
}
