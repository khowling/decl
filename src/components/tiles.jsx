import React from 'react';
import { IconField } from './utils.jsx';
import { Link, navTo } from './router.jsx';
import DynamicForm from '../services/dynamicForm.js';

function Tile1({meta}) { 
  return (
    <li className="slds-p-horizontal--small slds-size--xx-small">
      <Link component="ListPage" formid={meta._id} className="slds-app-launcher__tile slds-text-link--reset slds-app-launcher__tile--small">
        <div className="slds-app-launcher__tile-figure slds-app-launcher__tile-figure--small">
          { meta.icon ?
          <IconField value={meta.icon} large={true}/>
          :
          <IconField value={{_id:"std30"}} large={true}/>
          }
        </div>
        <div className="slds-app-launcher__tile-body slds-app-launcher__tile-body--small">
          <p className="slds-truncate slds-text-link" title={meta.name}>{meta.name}</p>
        </div>
      </Link>
    </li>
)}

// Top level form
export function TileList1 ({formids}) {
  let df = DynamicForm.instance
  console.log (`TileList - render`)
  return (
    <div className="slds-section slds-is-open" style={{padding: "0.5em"}}>
      <div className="slds-section__title">
        <button className="slds-button slds-button--icon slds-m-right--small">
          <svg aria-hidden="true" className="slds-button__icon">
            <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#switch"></use>
          </svg>
          <span className="slds-assistive-text">Toggle visibility of section</span>
        </button>
        <h3>All Items</h3>
      </div>
      <div className="slds-section__content">
        <ul className="slds-grid slds-grid--pull-padded slds-wrap">

          {formids.map(function(fid, i) {
            const f = df.getForm(fid)
            if (f) { 
              return <Tile1 key={i+':'+fid} meta={df.getForm(fid)}/>
            } else {
               return <div>fid {fid} not found</div>
            }})}
        </ul>
      </div>
    </div>
  )
}

// Top level form
export function TileList ({formids}) {
  let df = DynamicForm.instance
  console.log (`TileList - render`)
  return (
    <div className="slds-modal__content slds-app-launcher__content slds-p-around_medium" id="modal-content-id-1">
        <div className="slds-section slds-is-open">
          <h3 className="slds-section__title">
            <button aria-controls="appsContent" aria-expanded="true" className="slds-button slds-section__title-action">
              <svg className="slds-section__title-action-icon slds-button__icon slds-button__icon_left" aria-hidden="true">
                <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#switch"></use>
              </svg>
              <span className="slds-truncate" title="All Apps">All Forms</span>
            </button>
          </h3>
          <div aria-hidden="false" className="slds-section__content" id="appsContent">
            <div className="slds-assistive-text" id="drag-live-region" aria-live="assertive"></div>
            <ul className="slds-grid slds-grid_pull-padded slds-wrap">

              {formids.map(function(fid, i) {
              const f = df.getForm(fid)
              if (f) { 
                return <Tile key={i+':'+fid} meta={df.getForm(fid)}/>
              } else {
                return <li><div>fid {fid} not found</div></li>
              }})}

            </ul>
          </div>
          </div>
        </div>
  )
}

function Tile({meta}) { 
  return (
    <li className="slds-p-horizontal_small slds-size_1-of-1 slds-medium-size_1-of-3">
      <div className="slds-app-launcher__tile slds-text-link_reset" onClick={() => navTo("ListPage", meta._id)}>
        <div className="slds-app-launcher__tile-figure">
            { meta.icon ?
            <IconField value={meta.icon} large={true}/>
            :
            <span className="slds-avatar slds-avatar_large">
              <abbr className="slds-avatar__initials slds-icon-custom-27" title="Sales Cloud">{meta.name[0]}</abbr>
            </span>
            }
          
          
        </div>
        <div className="slds-app-launcher__tile-body">
          <Link component="ListPage" formid={meta._id}>{meta.name}</Link>
          <p>{meta.desc}</p>
          <div className="slds-popover slds-popover_tooltip slds-nubbin_top slds-hide" role="tooltip" id="help-0" style={{"position":"absolute","top":"100px","left":"165px"}}>
            <div className="slds-popover__body"></div>
          </div>
        </div>
      </div>
    </li>
  )

}