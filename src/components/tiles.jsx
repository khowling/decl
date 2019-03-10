import React from 'react';
import { IconField } from './utils.jsx';
import { Link } from './router.jsx';
import DynamicForm from '../services/dynamicForm.js';

function Tile({meta}) { 
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
export function TileList ({formids}) {
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
              return <Tile key={i+':'+fid} meta={df.getForm(fid)}/>
            } else {
               return <div>fid {fid} not found</div>
            }})}
        </ul>
      </div>
    </div>
  )
}
