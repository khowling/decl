import React from 'react';
import {FormMain} from './dform.jsx'
import DynamicForm from '../services/dynamicForm.js';
import {Link} from './router.jsx'

export function Register() {

  function _onFinished() {
  }

  const
    df = DynamicForm.instance,
    userform = df.getFormByName("Users"),
    passform = df.getFormByName("AuthProviders"),
    provider_field = userform.fields.find(f => f.name === "provider");
   
  return (
    <div>
      <FormMain form={userform} crud="c" onComplete={_onFinished}/>
      <FormMain form={passform} value={{status: "ready", record: {type:"password", provider_id: "this"}}} parent={{form_id: userform._id, field_id: provider_field._id, record_id: null}} crud="c" onComplete={this._onFinished.bind(this)}/>
    </div>
  )

}

export function Login() {

  function _signin (e, d) {
    console.log (e);
  }

  return (
    <div className="slds-container--center slds-container--small" style={{"marginTop": "100px"}}>

      <div className="grid-card">
          <p className="login-box-msg">Sign in to start your session</p>

            <div className="slds-form--horizontal slds-grid slds-wrap" style={{padding: "1em"}}>
              <div className="slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-2">
            <form onSubmit={_signin}>

              <div className="slds-form-element">
                  <label className="slds-form-element__label">Email</label>
                  <div className="slds-form-element__control">
                    <input type="text" className="slds-input" />
                  </div>
              </div>

              <div className="slds-form-element">
                  <label className="slds-form-element__label">Password</label>
                  <div className="slds-form-element__control">
                    <input type="password" className="slds-input" />
                  </div>
              </div>


              <div className="slds-form-element">
                <button type="submit" className="slds-button slds-button--neutral">Sign In</button>
              </div>
            </form>
          </div>
        </div>
        <hr className="hr hr--pink"></hr>
        <div>
          <div className="social-auth-links text-center">
              <a className="fbconnect_login_button FBConnectButton FBConnectButton_Large" href={`${process.env.REACT_APP_SERVER_URL}/auth/facebook?state=${encodeURIComponent(window.location.origin)}`} id="facebook_login_btn">
                  <span className="FBConnectButton_Text">login or register with Facebook</span>
              </a>
              <br/>
              <button className="btn btn-block btn-social btn-google-plus btn-flat"><i className="fa fa-google-plus"></i> Sign in using Google+</button>
              <br/>
              <a className="slds-button slds-button_inverse" href={`${process.env.REACT_APP_SERVER_URL}/auth/forcedotcom?state=${encodeURIComponent(window.location.origin)}`} id="facebook_login_btn">
                  <span>login or register with Salesforce</span>
              </a>
              <a className="slds-button slds-button_inverse" href={`${process.env.REACT_APP_SERVER_URL}/auth/oauth2?state=${encodeURIComponent(window.location.origin)}`} id="facebook_login_btn">
                  <span>login or register with Azure AD</span>
              </a>
          </div>

          <a href="/#">I forgot my password</a><br/>
          <Link appid="_" component="Register" className="text-center">Register a new membership</Link>
        </div>
      </div>
    </div>
  )
}
