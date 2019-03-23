import React, {useState, useEffect} from 'react';
import DynamicForm from '../services/dynamicForm.js';
import {Alert, Error} from './utils.jsx';
import {TileList} from './tiles.jsx'
import {ListMain, ListPage, RecordPage}  from './dform.jsx'
//import {TimeLine} from './timeline.jsx'
import {Login, Register }  from './auth.jsx'

import {ECOMPage, ECOMItem} from '../components-ms/ecommerce.jsx'

const DEFAULT_LANDING = 'TileList';


// Early SPAs used location hash to prevent roundtrip,  now the history API

// router.jsx - root format  
// http://host/<# admin / ListPage >?props=eyJmb3JtIjp7Il9pZCI6IjMwMzAzMDMwMzAzMDMwMzAzMDYxMzAzMCJ9fQ%3D%3D
// {"appid":"admin","component":"ListPage","props":{"form":{"_id":"303030303030303030613030"}},"urlparms":[]}
// Logic
//  <#/ if no appid, use the current app, else, use the users default app
//  if no compoenet, use the apps default comonent

function _encodeHash ({appid, component, props}) {

  let ulrstr = "/"
  if (appid) ulrstr+= appid+"/"
  if (component)  ulrstr+= component;
  if (props && Object.keys(props).length >0) ulrstr+= "?props=" + encodeURIComponent(btoa(JSON.stringify(props)));
  return ulrstr;
}


function getRouteObj(appid, component, formid, recordid, props) {
  const df = DynamicForm.instance
  let effectiveappid

  let routeJson = {props: {}, appid: !appid? df.app && df.app._id : appid}

  if (component) routeJson.component = component;
  // shortcut for props form id
  if (formid) routeJson.props.form = {_id: formid};
  // shortcut for prop for RecordPage
  if (recordid) routeJson.props.xid =  recordid // `"${recordid}"`;
  if (props) routeJson.props = Object.assign (routeJson.props, props)
  // console.log ('Router.URLFor : ' + JSON.stringify(routeJson));
  return routeJson //_encodeHash (routeJson);
}


// =====================================     Processes navigation routes Called from DOM 

export function Link({appid, component, formid, recordid, props, goback = false, children, ...rest}) {
  //console.log (`Link: ${component} (goback: ${goback} -  ${JSON.stringify(_Router_backUrl)})`)
  let routeJson

  if (goback && _Router_backUrl  && (_Router_backUrl.component === "ListPage" || _Router_backUrl.component === DEFAULT_LANDING)) {
    routeJson = _Router_backUrl
  } else {
    routeJson = getRouteObj(appid, component, formid, recordid, props)
  }

  function handleClick(event) {
    console.log ('Link: handleclick')
    if (
      !event.defaultPrevented && // onClick prevented default
      event.button === 0 && // ignore everything but left clicks
      !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // ignore clicks with modifier keys
    ) {
      console.log ('Link: pushstate')
      event.preventDefault()
      window.history.pushState("","",_encodeHash (routeJson))
      // now notify the router!!
      listeners.forEach(listener => listener(routeJson))
    }

  }
  return (<a {...rest} onClick={handleClick} href={_encodeHash (routeJson)}>{children}</a>)
}


// =====================================     Processes navigation routes Called from React JS 
export function navTo(component, formid, recordid, props, goback = false) {
  console.log (`navTo: ${component} (goback: ${goback})`)
  if (goback && _Router_backUrl && (_Router_backUrl.component === "ListPage" || _Router_backUrl.component === DEFAULT_LANDING)) {
    window.history.pushState("","",_encodeHash (_Router_backUrl))
    listeners.forEach(listener => listener(_Router_backUrl))
  } else {
    const routeJson = getRouteObj(null, component, formid, recordid, props)
    listeners.forEach(listener => listener(routeJson))
  }
}

export function decodeCurrentURI () {
  if (typeof window  === 'undefined') 
    throw new Error ("error")

  //const hashuri = decodeURI(window.location.href.split('#')[1])
  const url = new URL(window.location),
        [url_app, url_comp] =url.pathname.substr(1).split("/"),
        url_props = url.searchParams.get ("props")
  
  console.log (`decodeCurrentURI: ${JSON.stringify(url)}`)
  return {
    appid: (url_app && url_app !== "undefined")? url_app : undefined, 
    component: (url_comp &&  url_comp !== "undefined")? url_comp: undefined, 
    props: url_props ? JSON.parse(atob(decodeURIComponent(url_props))) : {}, 
    urlparms: []
  }
}
  
export function ensureAppInUrl (newappid) {
  let currentroute = decodeCurrentURI();
  if (currentroute.appid && (currentroute.appid !== newappid)) {
    //console.log ("router.jsx - ensureAppInUrl: !Chaning apps! Ensure the hash and params are wiped");
    delete currentroute.component;
    delete currentroute.params;
  }
  currentroute.appid = newappid;
  const newstate = _encodeHash(currentroute)
  //console.log (`router.jsx - ensureAppInUrl: replaceState : ${JSON.stringify(currentroute)} -> ${newstate}`)
  if (window) window.history.replaceState("", "", newstate);
}


const listeners = [];
var  _Router_backUrl = null;
const _Router_FACTORIES = Object.assign({}, ...[ECOMPage, ECOMItem, ListMain, TileList, ListPage, RecordPage, Register, Login, Register].map(mod => { return ({[mod.name]: React.createFactory(mod)})}))

export function useRouter (booted, loadedApp, newAppRequestedFn) {
  const [renderRoute, setRenderRoute] = useState()
  //const df = DynamicForm.instance

  console.log (`useRouter([booted: ${booted}, loadedApp: ${loadedApp && loadedApp.name}]): called.  [state: renderRoute : ${JSON.stringify(renderRoute)}]`)

  // Subscribe to <Link> events
  useEffect(() => {
    console.log ('useRouter: useEffect - initialise listeners to listen for <Link>)')
    listeners.push(newrouteRequested => setRenderRoute(newrouteRequested))
    return () => listeners.pop()
  },[])


  const chnRouteFn = (event) =>  setRenderRoute(decodeCurrentURI())

  // Subscribe to popstate events (browser back/forward buttons)
  useEffect(() => {
    console.log ('useRouter: useEffect - initialise listeners to listen for popstate (browser back/forward)')
    window.addEventListener('popstate', chnRouteFn, false)
    //chnRouteFn()
    return () => { window.removeEventListener('popstate', chnRouteFn, false)}
  }, [])


  useEffect(() => {
    console.log (`useRouter: useEffect - new value for [loadedApp: ${loadedApp && loadedApp.name}] or [booted: ${booted}]`)
    if (booted) {
      console.log (`useRouter: useEffect - Application is booted, so decode url & setRenderRoute`)
      chnRouteFn()
    }
  }, [loadedApp._id, booted])
  

  function renderComponents(loadedApp, renderRoute) {
    let comps = {}
    if (loadedApp._id && !renderRoute.component) { // app loaded, but no component in the url, use app landingpage
      if (loadedApp.landingpage && loadedApp.landingpage.length >0) { // app has a landingpage defined
        for (let pagecomp of loadedApp.landingpage) {
          let cf = _Router_FACTORIES[pagecomp.component._id];
          //console.log (`Router: render:  component "${pagecomp.component._id}", for position "${pagecomp.position}"`)
          if (cf) {
            //console.log (`Router: render: component ${pagecomp.component._id} with props ${JSON.stringify(pagecomp.props)}`)
            comps[pagecomp.position] = cf(Object.assign({key: pagecomp.component._id}, pagecomp.props))
          } else
            comps[pagecomp.position] = <Alert message={`404 - Cannot find component ${pagecomp.component._id}`}/>
        }
      } else { // app loaded but doesnt have a landingpage defined, using default landing
        console.log (`useRouter: renderComponents: app loaded, but no landing page`)
        comps = {main: (_Router_FACTORIES[DEFAULT_LANDING])(Object.assign({key: DEFAULT_LANDING}, {formids: loadedApp.appperms.
            map(f => f.form._id)}))}
      }

      //  console.log (`Router: rendering components : ${JSON.stringify(comps)}`);
      if (Object.keys(comps).length === 0) {
        comps =  {main: <Error msg="404 - No landing page defined for app" alert={true}/>}
      }

    } else if (renderRoute.component) { // got a component in the url, (app or not)
      // component direct
      let cf = _Router_FACTORIES[renderRoute.component];
      if (cf) {
        //console.log (`Router: render: component ${this.state.renderRoute.component} with props ${JSON.stringify(this.state.renderRoute.props)}`);
        comps = {main: cf(Object.assign({key: JSON.stringify(renderRoute.props)}, renderRoute.props))}
      } else {
        comps = {main: <Error msg={"404 - Unknown Compoent " + renderRoute.component}/>}
      }
    } else {
      console.warn ("renderComponents() - No app loaded and no compoent specified on url, return Login")
      comps = {main: <Login/>}
      //comps = {main: <Alert message={"404 - No Compoent Specified"} alert={true}/>}
    }
    return comps
  }

  
  if (!renderRoute) {
    console.log('useRouter: renderRoute not set, returning {}')
    return {};
  } else if (renderRoute.appid === "_" || loadedApp._id === renderRoute.appid) {
    console.log('useRouter: returning renderComponents')
    return renderComponents(loadedApp, renderRoute)
  } else {
    console.log('useRouter: return changing app')
    newAppRequestedFn (renderRoute.appid)
    return {}
  }
}
