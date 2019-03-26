
import React, {Component, useState, useEffect, useRef } from 'react';
import { Link } from './router.jsx';

//import ProgressBar from 'progressbar'
import {Modal, SvgIcon, IconField, Alert } from './utils.jsx';
import {ListMain, FormMain}       from './dform.jsx';
import {FormHeader}       from './headers.jsx';

import DynamicForm from '../services/dynamicForm.js';
import { putBlob, listFiles} from '../services/azureBlob.js';



/*
// ---------------------------------------------------------------------------------------------------
export class FieldAttachment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value, // needs to be mutatable
    };
  }

  componentWillReceiveProps(nextProps) {
    //console.log ('Field componentWillReceiveProps ' + JSON.stringify(nextProps));
    if (nextProps.value !== this.props.value) {
      //console.log ('the field value has been updated by the form, update the field (this will override the field state)');
      this.setState({value: nextProps.value});
    }
  }

  _clickFile() {
    this.refs.imageinput.click();
  }

  _fileuploadhtml5(e) {
    var file = e.currentTarget.files[0];

    
    this.setState({value: file}, () => {
      if (this.props.onChange)
        this.props.onChange ({[this.props.fielddef.name]: file});
      });
     //data.documents[field.name] = evt.target.responseText;
  
   return false;
  }


  render() {
    let img_src = this.state.value ? this.state.value.name : "Select File"

    if (!this.props.edit) {
      let marginBott = (!this.props.inlist) ? {marginBottom: "4px"} : {}
      return (
        <div className={this.props.inlist && "slds-avatar slds-avatar--circle slds-avatar--x-small"} style={marginBott}>
          <div style={{maxHeight: "150px"}} alt="message user image">{img_src}</div>
        </div>)

    } else {

      return (
        <div>
          <input type="file"  name="file"  accept="image/*" onChange={this._fileuploadhtml5.bind(this)} />
          
        </div>
      );
    }
  }
}
*/

// ------------------------------------------------------------------------------------------
export function FieldAttachment({fielddef, value, onChange, edit = false, inlist}) {

  const [ picFileList, setPicFileList ] = useState({state: "wait", records: []})
  const [ inputValue, setInputValue ] = useState(value)
  const [ existing, setExisting ] = useState({picselect: false, filemeta: null})
  const fileInputRef = useRef(null)

  const df = DynamicForm.instance

  // if prop value changes!
  useEffect(() => {
    if (inputValue !== value)
      setInputValue(value)
  }, [value])


  function _fileuploadhtml5(e) {
    var file = e.currentTarget.files[0];

    if (file) {
      console.log(' _fileuploadhtml5 : ' + file.name);
      putBlob(file, progressEvt => {
        console.log ('progress ' + progressEvt.loaded);
        if (progressEvt.lengthComputable) {
          //this.line.animate(Math.round(progressEvt.loaded / progressEvt.total));
        } else {
          //this.line.animate(0.5);
        }
      }, err => {
        alert (`_fileuploadhtml5 Upload failed: ${err}`)
      }).then (attachment => {

        //this.line.animate(1, () => this.line.set(0));
        console.log (`_fileuploadhtml5 Got :' + JSON.stringify (attachment)`);

        setInputValue(attachment)
        if (onChange) onChange ({[fielddef.name]: attachment})

      //data.documents[field.name] = evt.target.responseText;
    }, err => {
      // console.log ("There was an error attempting to upload the file:" + JSON.stringify(errEvt));
      alert (`Upload failed: ${err}`)
      //this.line.set(0);
    })
  } else {
    console.log ('pressed cancel')
  }
   return false;
  }

  function _selectedFile(file) {
    setExisting({picselect: false, filemeta: null})
    if (file) {
      const attachment = {container_url: DynamicForm.instance.readSAS.container_url, filename: file.Name}
      console.log ('called _selectedFile with:' + JSON.stringify(attachment))
      setInputValue(attachment)
      if (onChange) onChange ({[fielddef.name]: attachment})
    }
  }

  function _selectExisting() {
    const df = DynamicForm.instance,
        filemeta = df.getFormByName('FileMeta')

    if (filemeta) {
      setExisting({picselect: true, filemeta: filemeta})
      console.log (`listfiles`)
      listFiles().then(succVal => {
        setPicFileList({state: "wait", records: succVal});
      })
    } else {
      alert ("'FileMeta' not part of the application");
    }
  }

  
  function _clickFile() {
    // `current` points to the mounted file input element
    fileInputRef.current.click()
  }


  const img_src = (inputValue && df.readSAS) ? inputValue.container_url + "/" + inputValue.filename + "?" + df.readSAS.sas : "http://placehold.it/120x120"

  if (!edit) {
    return (
      <div className={inlist && "slds-avatar slds-avatar--circle slds-avatar--x-small"} style={!inlist ? {marginBottom: "4px"} : {}}>
        { !inlist?
          <a href={img_src} >
            <img style={{}} src={img_src} alt=""/>
          </a>
          :
          <img style={{}} src={img_src} alt=""/>
        }
      </div>
    )

  } else {

    return (
      <div>
        <input type="file" ref={fileInputRef} name="file" style={{display: "none"}} accept="image/*" onChange={_fileuploadhtml5} />
        <div className="pic-with-text" style={{backgroundImage: "url("+img_src+")"}}>
          <header>
            <div style={{margin: "8px 30px"}}>
              <button onClick={_clickFile}>upload new {fielddef.type}</button> |
              <button onClick={_selectExisting}> select existing {fielddef.type}</button>
            </div>
            { // <div ref="progressline"></div>
            }
          </header>

        </div>
        { existing.picselect &&
          <Modal>
            <div className="slds-modal__container w95">
              <div style={{padding: "0.5em", background: "white"}}>
                <FormHeader form={existing.filemeta}/>
              </div>
              <div className="slds-modal__content" style={{padding: "0.5em", minHeight: "400px"}}>
                <ListMain form={existing.filemeta} value={picFileList} selected={_selectedFile}/>
              </div>
              <div className="slds-modal__footer"></div>
            </div>
          </Modal>
        }
      </div>
    )
  }
}

//
// function to generate reference search form (for seleced value in edit and view modes, and list values)

function FieldReferenceLookupRenderProp ({search_form, record, render, children}) {
  //console.log (`FieldReferenceLookupRenderProp called ${search_form.name}`);
  let priimage, pritext
  if (record._error) {
    pritext = record._error
  } else for (let fld of search_form.fields) {
    if (fld.display === 'primary' && record[fld.name]) {
      //console.log (`FieldReferenceLookupRenderProp ${fld.type} ${JSON.stringify(record[fld.name])}`);
      if (fld.type === 'icon' || fld.type === 'image') {
        priimage = <Field fielddef={fld}  value={record[fld.name]} inlist={true} />
      } else if (fld.type === "reference" && fld.search_form._id === DynamicForm.instance.getFormByName("iconSearch")._id )
        priimage = <IconField value={record[fld.name]} small={true}/>
      else if (!pritext) {
        //pritext = <Field fielddef={fld} value={record[fld.name]}/>
        pritext = record[fld.name]
      }
    }
  }
  if (!priimage) {
    priimage = <IconField value={{_id:"std30"}} small={true}/>
  }
  return children({pritext, priimage});

}

export function FieldReference ({fielddef, value, onChange, edit}) {

  const [ lookup, setLookup ] = useState({ visible: false, values: [], open_create: false, offer_create: false})
  const [ inputValue, setInputValue ] = useState(value)
  const [ searchValue, setSearchValue ] = useState("")

  const df = DynamicForm.instance
  const sform = fielddef.search_form && df.getForm (fielddef.search_form._id)

  // if prop value changes!
  useEffect(() => {
    //console.log (`InputStateful useEffect ${fielddef.name}: prop:${value} state:${inputvalue}`)
    if (inputValue !== value)
      setInputValue(value)
  }, [value])

  function _handleSearchKeypress(e) {

    const 
      searchval = e.target.value,
      formid = fielddef.search_form && fielddef.search_form._id

    console.log ('FieldReference _handleSearchKeypress: ' + searchval);
    setSearchValue(searchval) // will rerender with new state
    DynamicForm.instance.search(formid, searchval).then(searchlist => {
      setLookup({visible: true, values: searchlist, offer_create: true})
    }, (err) => {
      console.error (`FieldReference _handleSearchKeypress : ${JSON.stringify(err)}`)
    })
  }
  
  function _openCreate() {
    // TODO = replace 'name' with primary text field
    setLookup({open_create: true, visible: false, values: [], createValue: {status: "ready", record: {name: searchValue}}});
  }
  
  function _handleLookupBlur(env) {
    console.log (`FieldReference _handleLookupBlur ${env.relatedTarget && env.relatedTarget.classList}`)
    if ((env.relatedTarget && env.relatedTarget.classList && env.relatedTarget.classList.contains("slds-input"))) {
      console.log ('FieldReference _handleLookupBlur - closing')
      setLookup({visible: false, values: [], offer_create: false})
    }
  }

  function _handleLookupRemove() {
    setInputValue(null) // will rerender with new state
    if (onChange) onChange({[fielddef.name]: null}) 
  }

  function _handleLookupSelectOption (data) {
    console.log ('FieldReference _handleLookupSelectOption, clear field state, then update parent ['+fielddef.name+']')
    //lookupval ={_id: data._id, search_ref: data} ;
    //console.log ('FieldReference _handleLookupSelectOption, set field state, then update parent ['+this.props.fielddef.name+'] : ' + JSON.stringify(data));
    setLookup({visible: false, values: [] })
    setInputValue(data) // will rerender with new state
    if (onChange) onChange({[fielddef.name]: data}) 

  }

  function _newLookupRecord(row) {
    //console.log ("FieldReference _newLookupRecord got new lookup record : " + JSON.stringify (row));
    setSearchValue("")
    setLookup({ visible: false, values: [], open_create: false, offer_create: false})
    setInputValue(row)
    if (onChange) onChange({[fielddef.name]: row}) 
  }


  if (!sform)
    return <Alert type="error" message={"no search_form found in app " + (fielddef.search_form && fielddef.search_form._id)}/>

  else if (!edit) {

    if (inputValue) {
    
      // this is here for the "metadata" - inline edit screen!
      if (inputValue._id && sform.store === "metadata") {
        console.log (`TODO -- its a read only field, its a lookup to static metadata?  setting state in a render`)
        //this.setState ({value: sform._data.find(x => x._id === this.state.value._id) || { error: `missing id ${this.state.value._id}`}});
      }

      return (
        <FieldReferenceLookupRenderProp search_form={sform} record={inputValue}>
          {({pritext, priimage}) => (
          <span className={`slds-pill ${fielddef.createnew_form? "slds-pill_link" : "" }`} style={{"border": "0"}}>
            
            <span className="slds-pill__icon_container">
              <span className="slds-icon_container">
                {priimage}
              </span>
            </span>

            { fielddef.createnew_form ? (
            <Link component="RecordPage" formid={fielddef.createnew_form._id} recordid={inputValue._id} className="slds-pill__action">
              <span className="slds-pill__label">{pritext}</span>
            </Link>
            ) : (
            <span className="slds-pill__label" style={{"paddingRight": "calc(1rem + 0.25rem + 2px)"}}>{pritext}</span>
            )}

          </span>
          )}
        </FieldReferenceLookupRenderProp>
      )
  
    } else  {
      return (<span/>)
    }
  } else { // its an EDIT

    //console.log ('referencefield get search_form : ' + JSON.stringify(this.props.fielddef.search_form));
    const cform = fielddef.createnew_form && df.getForm (fielddef.createnew_form._id)
    
    return (

      <div className={`slds-combobox_container ${inputValue ? "slds-has-selection" : ""}`}  > 
        <div className={`slds-combobox slds-dropdown-trigger ${lookup.visible ? "slds-is-open" : ""}`}>
          
        { inputValue ?
          <FieldReferenceLookupRenderProp search_form={sform} record={inputValue} >
            {({pritext, priimage}) => (
            <div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_left-right" role="none">
              
                <span className="slds-icon_container slds-combobox__input-entity-icon">
                  {priimage}
                </span>
                <input className="slds-input slds-combobox__input slds-combobox__input-value" autoComplete="off"  type="text" placeholder="Select an Option" readOnly defaultValue={pritext}/>
              
              <button className="slds-button slds-button_icon slds-input__icon slds-input__icon_right" title="Remove selected option" onClick={_handleLookupRemove}>
                <svg className="slds-button__icon" aria-hidden="true">
                  <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#close" />
                </svg>
                <span className="slds-assistive-text">Remove selected option</span>
              </button>
              </div>
            )}
            </FieldReferenceLookupRenderProp>
          :

          <div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right" role="none">
            <input className="slds-input slds-combobox__input" id="combobox-id-1" aria-autocomplete="list" aria-controls="listbox-id-1" autoComplete="off"  type="text" placeholder="Search..." onChange={_handleSearchKeypress} onBlur={_handleLookupBlur} onFocus={_handleSearchKeypress} disabled={inputValue ? "disabled" : ""}/>
            <span className="slds-icon_container slds-icon-utility-search slds-input__icon slds-input__icon_right">
              <svg className="slds-icon slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
                <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#search" />
              </svg>
            </span>
          </div>
        }
                      
        { lookup.open_create ?
          <Modal>
            <div className="slds-modal__container w95">
              <div style={{padding: "0.5em", background: "white"}}>
                <FormHeader form={cform}/>
              </div>
              <div className="slds-modal__content" style={{padding: "0", minHeight: "350px"}}>
                <FormMain key={"model-"+fielddef.name} form={cform} value={lookup.createValue} crud="c" onComplete={_newLookupRecord}/>
              </div>
              <div className="slds-modal__footer">
              </div>
            </div>
          </Modal>
        :
          <div className="slds-dropdown slds-dropdown_length-with-icon-7 slds-dropdown_fluid" style={{visibility: lookup.visible ? 'visible' : 'hidden'}}>
            <ul className="slds-listbox slds-listbox_vertical" role="presentation">

            { lookup.offer_create && cform && 
              <li className="slds-lookup__item ">
                <button onClick={_openCreate} className="link-button dont-close-on-blur">
                  <SvgIcon spriteType="utility" spriteName="add" small={true} classOverride="icon-utility"/>
                  Create {cform.name + ' "' + searchValue + '"'}
                </button>
              </li>
            }

            {
              lookup.values.map(function(row, i) { return (
                <li key={i} className="slds-lookup__item dont-close-on-blur" onClick={() => _handleLookupSelectOption(row)} >
        
                  <FieldReferenceLookupRenderProp search_form={sform} record={row} >
                  {({pritext, priimage}) => (
                  <div className="slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta" >
                    <span className="slds-media__figure slds-listbox__option-icon">
                      <span className="slds-icon_container">
                      {priimage}
                      </span>
                    </span>
                    
                      <span className="slds-media__body">
                        <span className="slds-listbox__option-text slds-listbox__option-text_entity">{pritext}</span>
                        <span className="slds-listbox__option-meta slds-listbox__option-meta_entity">{sform.name}</span>
                      </span>
                    
                  </div>
                  )}
                  </FieldReferenceLookupRenderProp>
                </li>
        
            );})}

            </ul>
          </div>
        }
        </div>
      </div>
    )
  }
}

export class FieldDate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: {date: new Date(props.value), visible: false, montharray: [] },
      time: {visible: false},
    };
  }

  _display_date(indate) {
    if (indate) {
      let outDate;
      if (typeof indate === "object") {
        outDate = indate;
      } else if (indate.length < 10 || isNaN(Date.parse(indate))) {
        return {date_str: indate, time_str: 'error'};
      } else {
        outDate =  new Date(Date.parse(indate));
      }
      return {date_str: outDate.toLocaleDateString(), time_str: outDate.toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit', hour12: true})};
    } else
      return {date_str: '', time_str: ''};
  }

  _construct_date(date_str, time_str) {
    if (date_str) {
      let date_arr;
      if (typeof date_str === 'string') {
        date_arr = date_str.split('/');
      } else if (typeof date_str === 'object') {
        date_arr = [ date_str.getDate(), date_str.getMonth()+1, date_str.getFullYear()];
      }
      if (date_arr.length === 3) {
        let time_arr = time_str ? time_str.replace(/ [ap]m/,'').split(':') : [12,0];

        if ((time_str && time_str.indexOf('am') > -1) === true && parseInt(time_arr[0]) === 12)
          time_arr[0] = 0;
        else if (parseInt(time_arr[0]) < 12 ) {
          time_arr[0] = parseInt(time_arr[0]) + 12;
        }
        let date_candidate = new Date(date_arr[2], date_arr[1]-1, date_arr[0], time_arr[0] || 12, time_arr[1] || 0);
        if (!isNaN( date_candidate))
          return date_candidate;
      }
    }
    return null;
  }

  _update_date(existingdate_str, date_str, time_str) {
    let new_date = this._construct_date(date_str, time_str),
        new_date_str = new_date ? new_date.toISOString() : date_str;

    //console.log (`change : [new ${new_date_str}] [existing: ${existingdate_str}]`);
    if (new_date_str !== existingdate_str && this.props.onChange) {
        this.props.onChange ({[this.props.fielddef.name]: new_date_str});
    }
  }

  /*******************/
  /* Common          */
  /*******************/

  componentWillReceiveProps(nextProps) {
    if (this.props.edit) {
      //console.log ('Field componentWillReceiveProps ' + JSON.stringify(nextProps));
      if (nextProps.value !== this.props.value) {
        //console.log ('the field value has been updated by the form, update the field (this will override the field state)');
        let {date_str, time_str} = this._display_date(nextProps.value);
        this.refs.input_date.value = date_str;
        this.refs.input_time.value = time_str;
        //this.setState({display_date: this._display_date(nextProps.value)});
      }
    }
  }
  componentDidMount() {
    if (this.props.edit) {
      let {date_str, time_str} = this._display_date(this.props.value);
      this.refs.input_date.value = date_str;
      this.refs.input_time.value = time_str;
    }
  }

  /*******************/
  /* Date  Functions */
  /*******************/
  _manualDateChange(e) {
    this._update_date(this.props.value, e.target.value, this.refs.input_time.value);
  }
  _manualTimeChange(e) {
    this._update_date(this.props.value, this.refs.input_date.value, e.target.value);
  }
  _pickTimeChange(time) {
    this.setState({time: {visible: false}}, () => {
      this._update_date(this.props.value, this.refs.input_date.value, time);
    });
  }

  _changeYear(e) {
    console.log (`year : ${e.target.value}`);
    this._showDate(null, null, e.target.value);
  }
  _showDate(selectday, chmnth, chyear) {
    if (this.state.date.visible && (!selectday) && (!chmnth) && (!chyear)) {
      this.setState ({date: {visible: false}});
    } else {
      if (selectday) {
        console.log (`_showDate selectday ${selectday}`);
        let newDate = new Date(this.state.date.year, this.state.date.month, selectday, 0,0,0);
        this.setState ({date: {visible: false}}, () => {
          this._update_date(this.props.value, newDate, this.refs.input_time.value);
        });
      } else {

        let start_date = this.state.date.visible ? new Date(this.state.date.year, this.state.date.month, 1) : this._construct_date(this.refs.input_date.value) || new Date();
        console.log (`_showDate chmnth ${chmnth} chyear ${chyear}`);
        if (chmnth)
          start_date.setMonth(start_date.getMonth() + chmnth);
        else if (chyear)
          start_date.setFullYear(chyear);


        let montharray = [],
            daycnt = 0,
            today = start_date.getDate(),
            firstDoW = new Date(start_date.getFullYear(), start_date.getMonth(), 1).getDay(), // day of week [0-6]
            lastDoM = new Date(start_date.getFullYear(), start_date.getMonth(), 0).getDate(); // day of month [1-31]

        for (let wkidx of [0,1,2,3,4,5]) {
          montharray[wkidx] = [];
          for (let dayidx of [0,1,2,3,4,5,6]) {
            if (wkidx === 0 && dayidx === firstDoW) daycnt = 1; // found 1st day of month, start the count up
            montharray[wkidx][dayidx] = "";
            if (daycnt >0 && daycnt <= lastDoM)  montharray[wkidx][dayidx] = daycnt++;
          }
          if (daycnt > lastDoM)  break;
        }
        this.setState ({date: {visible: true, today: today, month: start_date.getMonth(), year: start_date.getFullYear(), montharray: montharray }})
      }
    }
  }
  _showTime() {
    if (this.state.time.visible) {
      this.setState ({time: {visible: false}});
    } else {
      this.setState ({time: {visible: true}});
    }
  }

  render() {
    if (!this.props.edit) {
      return (
         <span>{this.props.value ? new Date(this.props.value).toLocaleString() : ""}</span>
       );
    } else {
      let self = this;
      return (
        <div className="form-element__group slds-form--compound">
        <div className="slds-form-element__row">

          <div className="slds-form-element__control slds-size--6-of-12">
            <div className="slds-input-has-icon slds-input-has-icon--right">
              <button onClick={this._showDate.bind(this,null,null,null)} className="link-button"><SvgIcon spriteType="utility" spriteName="event" small={true} classOverride="slds-input__icon" /></button>
              <input ref="input_date" className="slds-input" type="text" placeholder="Pick a Date"  onBlur={this._manualDateChange.bind(this)}/>
            </div>
          </div>



          { this.state.date.visible &&
          <div className="slds-dropdown slds-dropdown--left slds-datepicker">
            <div className="slds-datepicker__filter slds-grid">
              <div className="slds-datepicker__filter--month slds-grid slds-grid--align-spread slds-size--3-of-4">
                <div className="slds-align-middle">
                  <button onClick={this._showDate.bind(this,null,-1,null)} className="slds-button slds-button--icon-container">
                    <SvgIcon spriteType="utility" spriteName="left" small={true}/>
                    <span className="slds-assistive-text">Previous Month</span>
                  </button>
                </div>
                <h2 id="month" className="slds-align-middle" aria-live="assertive" aria-atomic="true">{["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
][this.state.date.month]}</h2>
                <div className="slds-align-middle">
                  <button onClick={self._showDate.bind(self,null,1,null)} className="slds-button slds-button--icon-container">
                    <SvgIcon spriteType="utility" spriteName="right" small={true}/>
                    <span className="slds-assistive-text">Next Month</span>
                  </button>
                </div>
              </div>
              <div className="slds-picklist slds-picklist--fluid slds-shrink-none">
                <select className="slds-select" onChange={this._changeYear.bind(this)} defaultValue={this.state.date.year} style={{paddingRight: "5px", paddingLeft: "10px", fontSize: "0.75rem", font: '100% / 1.5 "Salesforce Sans", Arial, sans-serif'}}>
                  <option value="2014">2014</option>
                  <option value="2015">2015</option>
                  <option value="2016">2016</option>
                  <option value="2017">2017</option>
                  <option value="2018">2018</option>
                  <option value="2019">2019</option>
                </select>
              </div>
            </div>
            <table className="datepicker__month" role="grid" aria-labelledby="month">
              <thead>
                <tr id="weekdays">
                  { ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) =>{ return (
                    <th key={i}><abbr>{day}</abbr></th>
                )})}
                </tr>
              </thead>
              <tbody>
                { this.state.date.montharray.map((wkarray, i) =>{ return (
                    <tr key={i}>
                    { wkarray.map((day, i) =>{ return (
                      <td key={i} className={day.length === 0 ?  "slds-disabled-text" : (day === this.state.date.today ? "slds-is-today" : "")}>
                        <span className="slds-day" onClick={self._showDate.bind(self, day)}>{day}</span>
                      </td>
                    )})}
                    </tr>
                )})}
              </tbody>
            </table>
          </div>
          }


          <div className="slds-form-element__control slds-size--6-of-12">
            <div className="slds-input-has-icon slds-input-has-icon--right">
              <button onClick={this._showTime.bind(this)} className="link-button"><SvgIcon spriteType="utility" spriteName="clock" small={true} classOverride="slds-input__icon" /></button>
              <input ref="input_time" className="slds-input" type="text" placeholder="Time" onBlur={this._manualTimeChange.bind(this)}/>
            </div>
          </div>
          { this.state.time.visible &&
          <div className="slds-lookup__menu" role="listbox" style={{right: "0px", width: "52%"}}>
           <ul className="slds-lookup__list" role="presentation">
             { ["9:00 am", "9:30 am", "10:00 am", "10:30 am", "11:00 am", "11.30 am", "8:00 pm"].map((time, i) =>{ return (
             <li className="slds-lookup__item">
               <button id="s01" onClick={this._pickTimeChange.bind(this, time)} className="link-button">{time}</button>
             </li>
             )})}
            </ul>
           </div>
           }
          </div>
        </div>
      );
    }
  }
}

export function Field ({fielddef, value, edit, inlist, onChange}) {

  function _handleValueChange (event) {
    console.log (`Field - _handleValueChange: ${fielddef.name}: ${event.target.value}`)
    onChange ({[fielddef.name]: event.target.value});
  }

  //console.log (`dform_field.jsx - Field,  ${fielddef.name} : ${JSON.stringify(value)}`);
  let field
  const df = DynamicForm.instance

  if (fielddef.type === "image" || fielddef.type === 'attachment') {
    field = (<FieldAttachment fielddef={fielddef} value={value} edit={edit} onChange={onChange} inlist={inlist}/>);
  } else if (fielddef.type === "reference") {
    field = (<FieldReference fielddef={fielddef} value={value} edit={edit} onChange={onChange} inlist={inlist}/>);
  } else if (fielddef.type === "datetime") {
    field = (<FieldDate fielddef={fielddef} value={value} edit={edit} onChange={onChange} inlist={inlist}/>);
  } else if (!edit) switch (fielddef.type) {
      case 'text':
      case 'email':
      case 'textarea':
      case 'formula':
        field = (<span>{value}</span>);
        break;
      case 'secret':
        field = (<span><small>not displayed</small></span>);
        break;
      case 'attachment':
        field = (<span>{value}</span>);
        break;
      case 'boolean':
        field = (
          <span className="slds-checkbox slds-checkbox_standalone">
            <input className="checkbox" type="checkbox" checked={value ? JSON.parse(value) : false} disabled="1" />
            <span className="slds-checkbox_faux"></span>
          </span>)
        break;
      case 'jsonarea':
        field = (<span>{JSON.stringify(value, null, 4)}</span>);
        break;
      case 'dropdown':
        let ddopt = value &&  fielddef.dropdown_options.filter(f => f.key === value)[0];
        field = <span>{ddopt ? ddopt.name : (value ? 'Unknown option <' + value +'>' : '')}</span>
        break;
      case "dropdown_options":
        let cform = fielddef.child_form && df.getForm(fielddef.child_form._id);
        if (cform)
          field = <ListMain form={cform} inline={true} value={{status: "ready", records: value}} viewonly={true}/>
        else
          field = <Alert type="error" message={`${fielddef.child_form._id} not part of applicatiohn`}/>
        break;
      case 'childform':
        //let cform = MetaStore.getForm (fielddef.child_form);
        //field = <ChildForm form={cform} value={value}/>;
        field = <span>childform not supported here</span>
        break
      case "icon":
        if (value)
            field = <SvgIcon spriteType={value.type} spriteName={value.name} small={true}/>
        else
          field = <span/>
        break
      default:
        field = <span>Unknown fieldtype {fielddef.type}</span>;
        break
  } else {
    field = <InputStateful fielddef={fielddef} value={value} onChange={_handleValueChange} />
  }
  
  return field;
}

// required to prevent rerendering of input field (so cursor doesnt jump while editing)
function InputStateful ({fielddef, value, onChange}) {
  if (!value) value = ""
  const [ inputvalue, setInputValue ] = useState(value)

  //console.log (`InputStateful ${fielddef.name}: prop:${value} state:${inputvalue}`)
  
  function handleValueChange(e) {
    let newval
    if (fielddef.type !== "boolean") 
       newval = e.target.value
    else 
      newval = e.target.checked

    //console.log(`InputStateful - handleValueChange ${newval}`)
    setInputValue(newval) // will rerender with new state
    onChange({target: {value: newval}}) // will rerender with new prop (and thus call useEffect)
  }

  function inlineDataChange  (val) {
    //console.log ("Field: _inlineDataChange : got update from List : " + JSON.stringify(val));
    setInputValue(val.data)
    onChange ({target: {value: val.data}})
  }

  // if prop value changes, and its different from the current state, then update the state
  useEffect(() => {
    //console.log (`InputStateful useEffect ${fielddef.name}: prop:${value} state:${inputvalue}`)
    if (inputvalue !== value)
      setInputValue(value)
  }, [value])

  let field
  switch (fielddef.type) {
    case 'text':
    case 'email':
    case 'secret':
      field =  <input type={fielddef.type === "secret"? "password" : "text"} className="slds-input" placeholder={fielddef.placeholder} value={inputvalue} onChange={handleValueChange}/>
      break;
    case 'textarea':
    case 'formula':
    case 'jsonarea':
      field = <textarea className="slds-input" rows="3" placeholder={fielddef.placeholder} value={inputvalue} onChange={handleValueChange}></textarea>;
      break;
    case 'boolean':
      field = (
        <span className="slds-checkbox slds-checkbox_standalone">
          <input type="checkbox" checked={value} onChange={handleValueChange} />
          <span className="slds-checkbox_faux"></span>
        </span>)
      break
    case 'dropdown':
      field = <select className="slds-input" value={value} onChange={handleValueChange}>
                    <option value="">-- select --</option>
                    {fielddef.dropdown_options.map (function(opt, i) { return (
                    <option key={i} value={opt.key}>{opt.name}</option>
                    );})}
                  </select>;
      break
    case 'childform':
      field = <div></div>;
      break
    case 'dropdown_options':
      let cform = fielddef.child_form && DynamicForm.instance.getForm(fielddef.child_form._id);
      if (cform)
        field = (<ListMain form={cform} inline={true} value={{status: "ready", records: value || [] }}  onDataChange={inlineDataChange}/>);
      else
        field = (<div>{fielddef.child_form._id} not part of applicatiohn</div>);
      break
    default:
      field = <div>Unknown fieldtype {fielddef.type}</div>;
      break
  }

  return  field
}
