import React, {useState, useEffect} from 'react'
import { Alert, Waiting } from './components/utils.jsx'
import {useRouter, ensureAppInUrl, decodeCurrentURI} from './components/router.jsx'
import {PageHeader} from './components/headers.jsx'
import DynamicForm from './services/dynamicForm.js'


export default ({appid}) => {
  console.log (`App(${appid}) called`)
  // we recommend to split state into multiple state variables based on which values tend to change together.
  const df = DynamicForm.instance
  const [ appState, setAppState] = useState ({user: null, loadedApp: {}, booted: false, booterr: false,  bootmsg: "Loading...."})
  const { head, side, main, foot } = useRouter (appState.booted, appState.loadedApp, newAppRequestedFn)

  // think of useEffect Hook as componentDidMount, componentDidUpdate, and componentWillUnmount combined
  // Think of effects as an escape hatch from React’s purely functional world into the imperative world
  // passing in a empty array, tells React that your effect doesn’t depend on any values from props or state, so it never needs to re-run. This isn’t handled as a special case — it follows directly from how the inputs array always wor
  useEffect(() => {
    console.log (`App: useEffect, initialise -  _loadapp with appid(parameter): ${appid}`)
    _loadApp(appid)
  }, [])

  function _loadApp(appid) {
    console.log (`App: _loadApp with appid: ${appid}`)
    if (appid === '_') {
      /* render the pages with no app (Login) */
      setAppState({ booted: true, booterr: false, bootmsg: null, loadedApp: {}})
    } else {
      df.loadApp(appid).then (() => {
        if (!df.app) {
          setAppState({ booted: false, booterr: true, booterr_appid: appid, bootmsg: 'Error loading app : ' + appid, loadedApp: {}});
        } else {
          console.log (`App: _loadApp: got app from server "${df.app._id}" ensureAppInUrl, then setAppState`);
          if (!appid) ensureAppInUrl (df.app._id)
          setAppState({ booted: true, booterr: false, bootmsg: null, user: df.user, loadedApp: df.app})
        }
      }, (e) => {
        console.error(`Error loading app: ${e.error}`)
        setAppState({ booted: false, booterr: true, booterr_appid: appid, bootmsg: `Error loading app: ${e.error}`, loadedApp: {}})
      })
    }
  }

  function newAppRequestedFn (appid) {
    console.log (`App: router noitified App route updated, checking app changed : new reequested: ${appid}, current ${appState.loadedApp._id}`)
    if (!(appState.booterr === true && appState.booterr_appid === appid)) // prevent loop trying to load a failed app!
      _loadApp(appid);
  }

  function _logout() {
    //console.log ('App: _logout router noitified');
    df.logOut().then(succ => {
      setAppState({ booted: false, booterr: false, user: null, loadedApp: {}})
      window.location.href = "/_/Login"
      _loadApp (null);
    });
  }


  if (appState.booted)  return (
    <div className="viewport">
      <PageHeader currentApp={appState.loadedApp} user={appState.user} logoutFn={_logout}/>
      <section style={{"marginTop": "50px"}}>
      { /*
        <Router key={appState.currentApp._id} currentApp={appState.currentApp} newAppRequestedFn={newAppRequestedFn}>
         {({head, main, side, foot}) => 
      */ }
       <div className="slds-grid slds-wrap">
            { head && <div className="slds-col slds-size--1-of-1">{head}</div>
            }
            { main && <div className="slds-col slds-size--1-of-1 slds-medium-size--3-of-3">{main}</div>
            }
            { side && <div className="slds-col slds-size--1-of-1 slds-medium-size--1-of-3">{side}</div>
            }
            { foot && <div className="slds-col slds-size--1-of-1">{foot}</div>
            }
          </div>
          {/*
        }
        </Router>
      */ }
      </section>
    </div>
  ); else if (appState.booterr) return (
    <div>
      <Alert message={"User/App is not correctly configured, please email the system ower with this message:  " + appState.bootmsg}/>
      <div className="slds-align--absolute-center" style={{"marginTop": "50px"}}><span className="slds-badge"><a href="/">Return to Home</a></span></div>
    </div>
  ); else return (
    <Waiting msg={appState.bootmsg}/>
  )
}
