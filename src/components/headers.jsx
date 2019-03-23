import React, { useState, useEffect } from 'react';
import { SvgIcon, IconField } from './utils.jsx';
import { Link } from './router.jsx';
import DynamicForm from '../services/dynamicForm.js';


function HeaderPopup({offset, closefn, user, logoutFn, notifications}) {

  function close() {
    closefn()
  }
  
  return (
    <section className="slds-popover slds-popover_large slds-nubbin_top-right" role="dialog" aria-labelledby="dialog-heading-id-8" aria-describedby="dialog-body-id-8" style={{"position":"absolute","top":"calc(100% + 12px)","right":offset}}>
    <button onClick={close} className="slds-button slds-button_icon slds-button_icon-small slds-float_right slds-popover__close slds-button_icon" title="Close dialog">
      <svg className="slds-button__icon" aria-hidden="true">
        <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
      </svg>
      <span className="slds-assistive-text">Close dialog</span>
    </button>


    { !notifications? [

    <header key="1" className="slds-popover__header">
      <h2 className="slds-text-heading_small">User</h2>
    </header>,

    <div key="2" style={{"margin": "1rem"}}>
      <article className="slds-tile slds-media">
        <div className="slds-media__figure">
          <span className="slds-avatar slds-avatar_circle slds-avatar_medium">
            <img alt="" src="/assets/images/avatar2.jpg" />
          </span>
        </div>
        <div className="slds-media__body">
          <h3 className="slds-tile__title slds-truncate">
            <Link onClick={close} appid="admin" component="RecordPage" formid="303030303030303030363030" recordid={user._id}>{user.name}</Link>
          </h3>
          <div className="slds-tile__detail">
            <dl className="slds-list_horizontal slds-wrap">
              <dt className="slds-item_label slds-text-color_weak slds-truncate" title="First Label">Role:</dt>
              <dd className="slds-item_detail slds-truncate" title="Description for first label">{user.role}</dd>
              <dt className="slds-item_label slds-text-color_weak slds-truncate" title="First Label">Tenant:</dt>
              <dd className="slds-item_detail slds-truncate" title="Description for first label"><Link onClick={close} appid="admin" component="RecordPage" formid="303030303030303030333530" recordid={user.tenant && user.tenant._id}>{user.tenant && user.tenant.name}</Link></dd>
              <dt className="slds-item_label slds-text-color_weak slds-truncate" title="First Label"></dt>
              <dd className="slds-item_detail slds-truncate" title="Description for first label"><button onClick={logoutFn} className="link-button" style={{"color": "#006dcc", "textDecoration": "none", "transition": "color 0.1s linear"}}>Log out</button></dd>
             
            </dl>
          </div>
        </div>
      </article>
    </div>,




    <div key="3" className="slds-popover__body slds-p-horizontal_none" id="dialog-body-id-16">
      <div id="listbox-unique-id" role="listbox">
        <ul className="slds-listbox slds-listbox_vertical slds-dropdown_length-10" role="group" aria-label="App Selector">
          <li role="presentation" className="slds-listbox__item">
            <div className="slds-media slds-listbox__option slds-listbox__option_plain" role="presentation">
              <h3 className="slds-listbox__option-header" role="presentation">App Selector</h3>
            </div>
          </li>
          { user.apps && user.apps.map(function(val, i) { return (
            <li key={i} role="presentation" className="slds-listbox__item">
            <Link appid={val.app._id} className="slds-text-link_reset slds-has-flexi-truncate">
              <div id="listbox-option-id-20" className="slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta">
                <span className="slds-media__figure">
                  <span className="slds-icon_container slds-icon-standard-account">
                    <svg className="slds-icon slds-icon_small" aria-hidden="true">
                      <IconField value={val.app.icon} small={true}/>
                    </svg>
                  </span>
                </span>
                <span className="slds-media__body">
                  <span className="slds-listbox__option-text slds-listbox__option-text_entity">{val.app.name}</span> 
                  <span className="slds-listbox__option-meta slds-listbox__option-meta_entity">{val.app.type}</span>
                </span>
              </div>
              </Link>
            </li>
          )})}
        </ul>
      </div>
    </div>,

    ]

    : [

    <header key="10" className="slds-popover__header">
      <h2 className="slds-text-heading_small">Notifications</h2>
    </header>,


    <div key="11" className="slds-popover__body slds-p-around_none">
      <ul>
      { notifications.map(function(val, i) { return (
        <li className="slds-global-header__notification slds-global-header__notification_unread">
          <div className="slds-media slds-has-flexi-truncate slds-p-around_x-small">
            <div className="slds-media__figure">
              <span className="slds-avatar slds-avatar_small">
                <img alt="Val Handerly" src="/assets/images/avatar2.jpg" title="Val Handerly avatar" />
              </span>
            </div>
            <div className="slds-media__body">
              <div className="slds-grid slds-grid_align-spread">
                <a href={val.url} className="slds-text-link_reset slds-has-flexi-truncate">
                  <h3 className="slds-truncate" title="Val Handerly mentioned you">
                    <strong>Val Handerly mentioned you</strong>
                  </h3>
                  <p className="slds-truncate" title="@jrogers Could I please have a review on my presentation deck">@jrogers Could I please have a review on my presentation deck</p>
                  <p className="slds-m-top_x-small slds-text-color_weak">10 hours ago
                    <abbr className="slds-text-link slds-m-horizontal_xxx-small" title="unread">●</abbr>
                  </p>
                </a>
              </div>
            </div>
          </div>
        </li>
      )})}

      </ul>
    </div>

    ]}

  </section>
  )
}
export function PageHeader({ currentApp, user, logoutFn }) {

  // useState returns a pair: the current state value and a function that lets you update it
  // declare a state variable
  const [searchtxt, setSearchTxt] = useState()
  const [popup, setPopup] = useState({show: false})

  useEffect(() => {
    setPopup({show: false})
  }, [currentApp, user])


  const df = DynamicForm.instance

  function handleSearchChange(e) {
    console.log (searchtxt)
    setSearchTxt(e.target.value)
  }

  function popup_user() {
    setPopup({show: true, props: {offset: "13px", user, logoutFn}})
  }

  function popup_notifications() {
    setPopup({show: true, props: {offset: "55px", notifcations: []}})
  }

  function close_popup() {
    setPopup({show: false})
  }

  return (
    <header className="slds-global-header_container">

      <div className="slds-global-header slds-grid slds-grid_align-spread">
        <div className="slds-global-header__item">
        <Link className="slds-icon-waffle_container slds-context-bar__button">
          {currentApp && currentApp.name || 'home'}
          </Link>
        </div>
        <div className="slds-global-header__item slds-global-header__item_search">
          <div className="slds-form-element">
            <label className="slds-form-element__label slds-assistive-text">Search...</label>
            <div className="slds-form-element__control">
              <div className="slds-combobox-group">
               
                <div className="slds-combobox_container slds-combobox-addon_end">
                  <div className="slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click" aria-expanded="false" aria-haspopup="listbox">
                    <div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_left slds-global-search__form-element" role="none">
                      <span className="slds-icon_container slds-icon-utility-search slds-input__icon slds-input__icon_left">
                        <svg className="slds-icon slds-icon slds-icon_xx-small slds-icon-text-default" aria-hidden="true">
                          <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#search"></use>
                        </svg>
                      </span>
                      <input onChange={handleSearchChange}  type="text" className="slds-input slds-combobox__input" aria-autocomplete="list" aria-controls="search-listbox-id-2" autoComplete="off" placeholder="Search..." />
                    </div>
                    <div className="slds-dropdown slds-dropdown_length-with-icon-7 slds-dropdown_fluid" role="listbox">
                      <ul className="slds-listbox slds-listbox_vertical" role="group" aria-label="Recent Items">
                        <li role="presentation" className="slds-listbox__item">
                          <div className="slds-media slds-listbox__option slds-listbox__option_plain slds-media_center" role="presentation">
                            <h3 className="slds-text-title_caps" role="presentation">Recent Items</h3>
                          </div>
                        </li>
                        <li role="presentation" className="slds-listbox__item">
                          <div  className="slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta">
                            <span className="slds-media__figure slds-listbox__option-icon">
                              <span className="slds-icon_container slds-icon-standard-opportunity">
                                <svg className="slds-icon slds-icon_small" aria-hidden="true">
                                  <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#opportunity"></use>
                                </svg>
                              </span>
                            </span>
                            <span className="slds-media__body">
                              <span className="slds-listbox__option-text slds-listbox__option-text_entity">bla</span>
                              <span className="slds-listbox__option-meta slds-listbox__option-meta_entity">bla</span>
                            </span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-global-header__item">
          <ul className="slds-global-actions">
            
            <li className="slds-global-actions__item">
              <div className="slds-dropdown-trigger slds-dropdown-trigger_click">
                <Link appid="admin" className="slds-button slds-button_icon slds-button_icon slds-button_icon-container slds-button_icon-small slds-global-actions__setup slds-global-actions__item-action" aria-haspopup="true" title="Setup">
                  <svg className="slds-button__icon slds-global-header__icon" aria-hidden="true">
                    <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#setup"></use>
                  </svg>
                  <span className="slds-assistive-text">Setup</span>
                </Link>
              </div>
            </li>
            <li className="slds-global-actions__item">
              <div className="slds-dropdown-trigger slds-dropdown-trigger_click">
                <button onClick={popup_notifications} className="slds-button slds-button_icon slds-button_icon slds-button_icon-container slds-button_icon-small slds-global-actions__notifications slds-global-actions__item-action" title="no new notifications" aria-live="assertive" aria-atomic="true">
                  <svg className="slds-button__icon slds-global-header__icon" aria-hidden="true">
                    <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#notification"></use>
                  </svg>
                  <span className="slds-assistive-text">no new notifications</span>
                </button>
                <span aria-hidden="true" className="slds-notification-badge">0</span>
              </div>
            </li>
            { !user? 
            <li className="slds-context-bar__item">
              <Link appid="_" component="Login" className="slds-context-bar__label-action" title="Menu Item">
                <span className="slds-truncate" title="Menu Item">login</span>
              </Link>
            </li>
            :
            <li className="slds-global-actions__item">
              <div className="slds-dropdown-trigger slds-dropdown-trigger_click">
                <button onClick={popup_user} className="slds-button slds-global-actions__avatar slds-global-actions__item-action" title="person name" aria-haspopup="true">
                  <span className="slds-avatar slds-avatar_circle slds-avatar_medium">
                    <img alt="Person name" src={(user.picture && df.readSAS) ? user.picture.container_url + "/" + user.picture.filename + "?" + df.readSAS.sas : "/assets/images/avatar2.jpg"} title="User avatar" />
                  </span>
                </button>
              </div>
            </li>
            }
          </ul>
        </div>
      </div>
      { popup.show && 
        <HeaderPopup {...popup.props} closefn={close_popup}/>
      }

    </header>


  )
}
/*
    <header className="slds-global-header_container">
        
      <div className="slds-global-header slds-grid slds-grid--align-spread">
        <div className="slds-global-header__item">
          <div className="slds-global-header__logo">

            <div className="slds-context-bar__primary slds-context-bar__item--divider-right">
              <div className="slds-context-bar__item slds-context-bar__dropdown-trigger slds-dropdown-trigger slds-dropdown-trigger--click slds-no-hover">
                <div className="slds-context-bar__icon-action">
                  <a href={Router.URLfor(true)} className="slds-icon-waffle_container slds-context-bar__button">
                    <div className="slds-icon-waffle">
                      <div className="slds-r1"></div>
                      <div className="slds-r2"></div>
                      <div className="slds-r3"></div>
                      <div className="slds-r4"></div>
                      <div className="slds-r5"></div>
                      <div className="slds-r6"></div>
                      <div className="slds-r7"></div>
                      <div className="slds-r8"></div>
                      <div className="slds-r9"></div>
                    </div>
                    <span className="slds-assistive-text">Open App Launcher</span>
                  </a>
                </div>
                <span className="slds-context-bar__label-action slds-context-bar__app-name">
                  <span className="slds-truncate" title="{ props.appName || 'App Name' }">{currentApp && currentApp.name }</span>
                </span>
              </div>
            </div>
        </div>
      </div>
      <div className="slds-global-header__item slds-global-header__item--search">
        <div className="slds-form-element slds-lookup slds-is-o pen">
          <label className="slds-assistive-text" >Search</label>
          <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon--left">
            <svg  className="slds-input__icon">
              <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#search"></use>
            </svg>
            <input id="global-search-01" className="slds-input slds-lookup__search-input" type="search" placeholder="Search" value={searchtxt} onChange={handleSearchChange} />
          </div>
        </div>
      </div>
      <ul className="slds-global-header__item slds-grid slds-grid--vertical-align-center">

        <AuthState user={user} currentApp={currentApp} onLogout={logoutFn}/>
  }
      </ul>
      </div>
    </header>
  ) 
}
*/
export function SectionHeader ({ title, buttons }) {
  return (
    <div className="slds- col slds-col-- padded slds -size--1-of-1 ">
      <div className="slds-grid form-seperator">
        <div className="slds-col slds-col--padded slds-has-flexi-truncate">
          <h3 className="slds-text-heading--small" style={{ marginTop: "8px" }}>{title}</h3>
        </div>
        <div className="slds-col slds-col--padded slds-no-flex slds-align-top" style={{ marginBottom: "4px" }}>
          {buttons && buttons.map(function (button, i) {
            return (
              <Button key={i} definition={button} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Button ({ definition }) {
  let runAction = () => {
    if (definition.hasOwnProperty('then')) {
      definition.action.cb().then(definition.then);
    } else {
      definition.action.cb();
    }
  }
  if (definition.action.hasOwnProperty('cb')) {
    return (
      <button className="slds-button slds-button--neutral" onClick={runAction} disabled={definition.disable || false}>{definition.title}</button>
    );
  } else if (definition.action.hasOwnProperty('nav')) {
    return (
      <Link className="slds-button slds-button--neutral" {...definition.action.nav} >{definition.title}</Link>
    );
  } else return (
    <div>Unknown action</div>
  )
}


export function FormHeader ({ form, buttons, count }) {
  let isformmeta = form === "303030303030303030313030";
  return (

    <div className="slds-page-header " role="banner">
      <div className="slds-grid">
        <div className="slds-col slds-has-flexi-truncate">

          <div className="slds-media">
            <div className="slds-media__figure">
              <Link component="ListPage" formid={form._id}>
                <IconField value={form.icon} large={true} />
              </Link>
            </div>

            <div className="slds-media__body">
              <p className="slds-text-heading--label">Record Type</p>
              <div className="slds-grid">
                <h1 className="slds-text-heading--medium slds-m-right--small slds-truncate slds-align-middle">{form.name}</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="slds-col slds-no-flex slds-align-bottom">
          <div className="slds-grid">
            {!isformmeta &&
              <div className="slds-button-space-left" aria-haspopup="true">
                <Link className="slds-button slds-button--icon-more" appid="admin" component="RecordPage" formid="303030303030303030313030" recordid={form._id}>
                  <SvgIcon spriteType="utility" spriteName="settings" small={true} classOverride="slds-button__icon icon-utility" />
                </Link>
              </div>
            }
            {buttons &&
              <div className="slds-button-group">
                {buttons.map(function (button, i) {
                  return (
                    <Button key={i} definition={button} />
                  )
                })}
              </div>
            }
          </div>
        </div>
      </div>
      { count && 
      <p className="slds-text-body--small slds-m-top--x-small">{count} items, sorted by name</p>
      }
    </div>
  );
}
