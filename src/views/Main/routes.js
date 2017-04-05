import React from 'react'
import {Route, IndexRedirect} from 'react-router'
import AuthService from 'utils/AuthService'
import Container from './Container'
import Home from './Home/Home'
import Login from './Login/Login'
import Admin from './Admin/Admin'
import Unauthorized from './Unauthorized/Unauthorized'

const auth = new AuthService(__AUTH0_CLIENT_ID__, __AUTH0_DOMAIN__);

// onEnter callback to validate authentication in private routes
// const requireAuth = (nextState, replace) => {
//   if (!auth.loggedIn()) {
//     replace({ pathname: '/login' })
//   }
// }

// onEnter callback to validate authentication in private routes
const requireAuth = (nextState, replace) => {
  if (!auth.loggedIn()) {
    localStorage.setItem('redirect_after_login', nextState.location.pathname)
    replace({ pathname: '/login' })
  } else {
    redirectAfterLogin(replace)
  }
}

// onEnter callback to require admin role
const requireAdminAuth = (nextState, replace) => {
  if (!auth.isAdmin()) {
    replace({ pathname: '/unauthorized' })
  }
}

const redirectAfterLogin = (replace) => {
  const url = localStorage.getItem('redirect_after_login')
  if (url){
    localStorage.removeItem('redirect_after_login')
    replace({ pathname: url })
  }
}

export const makeMainRoutes = () => {
  return (
    <Route path="/" component={Container} auth={auth}>
      <IndexRedirect to="/home" />
      <Route path="home" component={Home} onEnter={requireAuth} />
      <Route path="login" component={Login} />
      <Route path="admin" component={Admin} onEnter={requireAdminAuth} />
      <Route path="unauthorized" component={Unauthorized} />
    </Route>
  )
}

export default makeMainRoutes
