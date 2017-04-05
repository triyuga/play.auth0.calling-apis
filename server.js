var express = require('express');
var axios = require('axios');
var app = express();
var jwt = require('express-jwt');
require('dotenv').config();

const loggedProfiles = {}

if (!process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET){
  throw 'Make sure you have AUTH0_CLIENT_ID and AUTH0_SECRET in your .env file'
}

var authenticate = jwt({
  secret: process.env.AUTH0_SECRET,
  audience: process.env.AUTH0_CLIENT_ID,
  userProperty: 'token_payload'
});

app.get('/api/public', function(req, res) {
  res.json({ message: "Hello from a public endpoint! You don't need to be authenticated to see this." });
});

/**
 * Endpoint with admin authentication.
 */
app.get('/api/private', authenticate, authenticateAdmin, function(req, res) {
  res.json({ message: "Admin access granted via authenticated endpoint." })
});

app.listen(3001);
console.log('Listening on http://localhost:3001');

/**
 * Middleware for authenticating admin users, via their Auth0 profiles.
 */
function authenticateAdmin(req, res, next) {
  console.log('authenticating Admin...')
  new Promise(function(resolve, reject) {  

    // Extract idToken from request.
    const idToken = req.headers.authorization.replace('Bearer ', ''); // if request via fetch()
    // const idToken = req.query.token; // if requesting via axios.
    // console.log('idToken', idToken); 
    
    if (loggedProfiles[idToken]) {
      // Profile found in loggedProfiles. Rossolve.
      console.log('Got profile from existing entry in loggedProfiles.');
      resolve(loggedProfiles[req.query.token])
    }
    else {
      // Profile not found in loggedProfiles. Get user profile from Auth0.
      console.log('Getting profile via request to Auth0...');
      axios.get('https://triyuga.au.auth0.com/tokeninfo', {
        params: {
          id_token: idToken,
        }
      })
      .then(function (response) {
        // Add fetched profile to loggedProfiles.
        console.log('Got profile via request to Auth0, and added it to loggedProfiles. Resolve.');
        loggedProfiles[idToken] = response.data
        resolve(loggedProfiles[idToken])
      })
      .catch(function (error) {
        console.log('Axios error when getting /tokeninfo from Auth0 API', error)
      });
    }
  })
  .then(function(profile) {
    // console.log('profile', profile)
    const { roles } = profile.app_metadata || {}
    const isAdmin = !!roles && roles.indexOf('admin') > -1
    console.log('roles from profile.app_metadata:', roles)
    if (isAdmin) {
      console.log('Admin access granted.')
      return next()
    }
    else {
      console.log('Admin access denied.')
      return res.status(401).send('Admin access denied.')
    }
  })
}