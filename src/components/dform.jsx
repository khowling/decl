
import React, {useState, useEffect} from 'react'
import jexl from 'jexl'
import {navTo, Link} from './router.jsx'
import {Field} from './dform_fields.jsx'
import {Button, SectionHeader, FormHeader} from './headers.jsx'
import {Modal, SvgIcon, Alert, UpdatedBy } from './utils.jsx'
import DynamicForm from '../services/dynamicForm.js'
import {_formControlState} from '../shared/dform.mjs'


/*****************************************************************************
  * Called from Form Route (top), or within List (embedded)
  * Pass in the 'form' and the 'value' record (the value needs to be pre-fetched)
  * Functions: Render form fields, validate, save record, delete record
  *  
  * props:
  *    value: {
  *     record : <record to edit>, 
  *     status: "wait" | "ready"
  *    }
  *  crud: 
  *    c - create new (pass in any defaults via props.value.record)
  *    u - update
  *  parent: (this is a childform)
  *    form_id: 
  *    record_id: 
  *    field_id
  *  parentrec: (the full partent record, used for expression evaluation)
  *  onComplete: used by lookup and childform (if no onComplete, assume top)
  *  onFinished: 
  *  inModal: 
  ***************************************************************************/
export function FormMain ({form, crud, value, parent, parentrec, onComplete, onFinished, inModal, onDataChange}) {

  const [ form_control, setForm_control ] = useState(crud === "c" && value? {new_change_rec: value.record} : undefined)
  const [ serverError, setServerError ] = useState()
  const [inLineData, setInLineData] = useState({changedata: null, displayListModal: false,  inlineData: null, disableSave: true})
  const [ modelForm, SetModelForm] = useState({open: false, value: undefined, form: undefined, error: undefined, field_id: undefined, onComplete: undefined})
  const [ edit, setEdit] = useState(crud === "c" || crud === "u")
  
  useEffect(() => {
    console.log (`FormMain useEffect: prop value has changed ${value.status}`)
    setInLineData({changedata: null, displayListModal: false,  inlineData: null, disableSave: true})
    if (crud === "c" || (value && value.status === "ready")) {
      _formControlState (DynamicForm.instance.appMeta, edit? 1 : 0, form, value ? value.record : {}, form_control && form_control.new_change_rec, parentrec).then(form_control => {
        console.log (`FormMain useEffect: got new form_control ${JSON.stringify(form_control)}`)
        setForm_control(form_control)
      }, errval => {
        setServerError(JSON.stringify(errval))
        console.error (errval)
      })
    }
  }, [value])


  /************************/
  /*  manage inline data  */
  /************************/

  function _inlineDataChange(val) {
    console.log ("FormMain: _inlineDataChange : got update from List : " + JSON.stringify(val))
    setInLineData((prev) => { 
      const next = {...prev} //clone
      if (val.hasOwnProperty("data")) next.changedata = val.data
      if (val.hasOwnProperty("disableSave")) next.disableSave =  val.disableSave
      if (!next.changedata) next.disableSave = true
      console.log (`setting inLineData state : ${JSON.stringify(next)}`)
      return next
    })
  }

  function _inlineDataFinished(save) {
    console.log ("FormMain: _inlineDataFinished : save : " + JSON.stringify(save))
    if (save) {
      //df.save (form._id, Object.assign({_id: value.record._id}, {"_data": inLineData.changedata})).then(succval => {
      DynamicForm.instance.save (value.record._id, inLineData.changedata).then(succval => {
        console.log ('FormMain _save, response from server : ' + JSON.stringify(succval));
        if (onDataChange) {
          // this will re-load the data at the parent, and in turn send new props
          onDataChange()
        }
      }, errval => {
        setServerError(JSON.stringify(errval))
      });
    } else {
      setInLineData({changedata: null, displayListModal: false,  inlineData: null, disableSave: true})
    }
  }
  /*********************** */


      // Called form the Field
  function _fieldChange(dynamicFieldName, d) {
    console.log (`FormMain: _fieldchange [${dynamicFieldName}] : ${JSON.stringify(d)}`)

    if (dynamicFieldName) {
      // If any field value of the dynamic field changes, the change needs to be combined with the existing record, because the whole field its updated
      d = {[dynamicFieldName]: Object.assign(form_control.new_change_rec[dynamicFieldName] || {}, d)}
    }
    console.log (`FormMain: _fieldChange merging existing change: [${JSON.stringify(form_control.new_change_rec)}], with new change [${JSON.stringify(d)}]`)
    let change_data = Object.assign({}, form_control.new_change_rec, d);
    console.log (`--------- FormMain _fieldChange full change_data ${JSON.stringify(change_data)}`);
    _formControlState (DynamicForm.instance.appMeta, edit? 1 : 0, form, value ? value.record : {}, change_data, parentrec, form_control.formctl).then(form_control => {
      console.log (`FormMain: _fieldChange setting new form_control ${JSON.stringify(form_control)}`)
      setForm_control(form_control)
    }, err => {
      console.error (err)
    })
  }

  function _save() {
    return new Promise((resolve, reject) => {
      const body =  (value && value.record._id)? Object.assign({_id: value.record._id}, form_control.new_change_rec) : form_control.new_change_rec
      DynamicForm.instance.save (form._id, body, parent).then(saveval => {
          resolve(saveval);
      }, errval => {
        setServerError(JSON.stringify(errval))
        reject (errval)
      })
    })
  }

  function _delete() {
    return new Promise((resolve, reject) => {
      if (window.confirm("Sure?")) {
        var df = DynamicForm.instance;
        df.delete (form._id, value.record._id, parent).then(succval => {
          resolve(succval);
        }, errval => {
          setServerError(JSON.stringify(errval))
          reject (errval)
        });
      }
    })
  }


  console.log (`FormMain - render value: ${value && value.status}, form_control: ${form_control && form_control.formctl}`)
  const {formctl, new_change_rec, error} = form_control? form_control: {},
        record = Object.assign({}, value?  value.record : {}, new_change_rec)
        
  var buttons =[
          {
            show: edit && form.store !== 'input' && "F", title: "Save",
            action: {cb: _save},
            disable: formctl? formctl.invalid? true: false : true,
            then: onComplete ? (succval) => onComplete({_id: succval._id}) : (succval) => navTo("RecordPage", form._id, succval._id, null, true)
          }, {
            show: edit && form.store === 'input' && "F", title: "Continue",
            action: {cb: () => Promise.resolve(new_change_rec)},
            then: onComplete
          }, {
            show: edit ? "F" : onComplete && "H", title: "Cancel",
            action: onComplete ?  {cb: onComplete} : {nav: { component: record._id ? "RecordPage" : "ListPage", formid: form._id, recordid: record._id ? record._id : null, goback: true}}
          }, {
            show: !edit && "H", title: "Delete",
            action: {cb: _delete},
            then: onFinished ? (succval) => onFinished('delete', succval) : (succval) => navTo("ListPage", form._id)
          }, {
            show: !edit && "H" , title: "Edit",
            action: onComplete ? {cb: () => setEdit(true)} : {nav: {component: "RecordPage", formid: form._id, recordid: record._id, props: {e: true}}}
          }, {
            show: (!edit && form._id === "303030303030303030313030" && record.store === "metadata") && "H" , title: `Manage Data (${record._data ? record._data.length : '0'})`,
            action: {cb: () => setInLineData({changedata: null, displayListModal: true,  inlineData: value.record._data || [], disableSave: true})}
          }]
          
  if (form.fields && !edit) {
    console.log (`FormMain - looking for custom buttons : ${form.fields.filter(m => m.type === 'button').length}`)
    const custom_buttons = form.fields.filter(m => m.type === 'button').map(m => {return {show: "H", title: m.title, action: {cb: ((v) => {
      if (m.child_form) {
        console.log ('Customer button - if child form, get data')
        const cform = DynamicForm.instance.getForm(m.child_form._id);
        if (cform) {
          SetModelForm({value: {status: "ready", record: {}},form: cform,field_id: m._id, onComplete: (c) => {
            console.log (`got info from child form ${JSON.stringify(c)}`)
            if (c === null || typeof c === 'undefined') {
              // just cancel
              SetModelForm({"open": false})
            } else {
              jexl.eval(m.action, {child_form_data: c, rec: record}).then(() => SetModelForm({"open": false}))
            }
          }})
        } else {
          SetModelForm(Object.assign({ error: "Cannot find button child form in current app"}, modelForm))
        }
      } else {
        console.log (`running ${m.action}, with ${record.name}`)
        jexl.eval(m.action, {rec: record}).then(() => console.log (`ok`), (e) => console.error(e))
      }
      
    })}}})
    buttons = buttons.concat (custom_buttons)
  }


  console.log (`FormMain - inLineData.disableSave - ${inLineData.disableSave}`)
  return (
    <div className={inModal && "slds-modal__container w95"} >

      <div style={{padding: "0.5em", background: "white"}}>
        <SectionHeader title={form.name} buttons={buttons.filter(b => b.show === "H")} />
      </div>


      <div className={(inModal? "slds-modal__content" : "") + " slds-form--stacked"} style={{padding: "0.5em", minHeight: inModal? "400px" : "auto"}}>
        <div className="slds-grid slds-wrap">

          { error &&  <Alert type="error" message={error}/>  }

          { formctl && form.fields.filter(({type}) => type !== 'childform' && type !== 'relatedlist'  && type !== 'button').map(function(field, i) {
            const fc = formctl.flds[field.name] //? formctl.flds[field.name] : {visible: true, invalid: false}
            if (field.type !== 'dynamic') {
              if (fc.visible && fc.visible.error)
                return (<Alert message={`dynamic field expression error ${fc.visible.error}`}/>)
              else if (fc.visible) 
                return (<FieldWithLabel key={i} field={field} value={record[field.name]} edit={edit} invalid={fc.error} onChange={(...d) => _fieldChange(undefined,...d)}/>)
            } else  {
              const d_record = Object.assign({}, value?  value.record[field.name] : {}, new_change_rec[field.name])
              console.log (`dynamic field ${field.name}, dflds : ${JSON.stringify(value?  value.record[field.name] : {})}`);
              return (
                <div key={field.name} className="slds-col--padded slds-size--2-of-2 ">
                  <div className="slds-form-element">
                    <label className="slds-form-element__label form-element__label--small">{field.title}</label>
                    <div className="slds-box " style={{"padding": "0 0 12px 0"}}>
                      <div className="slds-grid slds-wrap">
                        {
                          fc.error? 
                            <Alert message={`dynamic field expression error ${fc.error}`}/> 
                          :
                            fc.dynamic_fields && fc.dynamic_fields.map(function(dfield, i) {
                            let fc = formctl.flds[field.name].flds[dfield.name]? formctl.flds[field.name].flds[dfield.name] : {visible: true, invalid: false}
                            return  (<FieldWithLabel key={i} field={dfield} value={d_record[dfield.name]} edit={edit} invalid={fc.error} onChange={(...d) => _fieldChange(field.name, ...d)}/>);
                          })
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            return (null)
          })}

          {(record._updatedBy && !edit) &&
            <div  className="slds-col slds-col--padded slds-size--2-of-2 slds-medium-size--2-of-2 slds-x-small-size--1-of-1">
              <div className="slds-form-element field-seperator ">
                <label className="slds-form-element__label form-element__label--small">Last Updated</label>
                <div className="slds-form-element__control"  style={{marginLeft: "15px"}}>
                  <UpdatedBy user={record._updatedBy} date={record._updateDate}/>
                </div>
              </div>
            </div>
          }

          { serverError &&
            <div className="slds-col slds-col--padded slds-size--1-of-1"  style={{marginTop: "15px"}}>
              <Alert type="error" message={serverError}/>
            </div>
          }

          { inLineData.displayListModal &&
            <Modal>
              <div className="slds-modal__container w95">
                <div style={{padding: "0.5em", background: "white"}}>
                  <SectionHeader title={value.record.name} buttons={[{title: "Cancel", action: {cb: () => _inlineDataFinished(null) }}, {title: "Save", disable: inLineData.disableSave, action: {cb: () => _inlineDataFinished(true)}}]} />
                </div>
                <div className="slds-modal__content" style={{padding: "0.5em", minHeight: "400px"}}>
                  <ListMain inline={true} form={value.record} value={{status: "ready", records: inLineData.inlineData}}  onDataChange={_inlineDataChange}/>
                  { serverError  &&
                    <div className="slds-col slds-col--padded slds-size--1-of-1"  style={{marginTop: "15px"}}>
                      <Alert type="error" message={serverError}/>
                    </div>
                  }
                </div>
                <div className="slds-modal__footer"></div>
              </div>
            </Modal>
          }

        </div>
      </div>

      <div className={inModal ? "slds-modal__footer" : "slds-col slds-col--padded slds-size--1-of-1"} style={{padding: "0.5em", textAlign: "right"}}>
        { buttons.filter(b => b.show === "F").map(function(button, i) { return (  
          <Button key={i} definition={button}/> 
            )
          })
        }
      </div>

      { modelForm.open && (
          modelForm.error ? 
          <Alert type="error" message={modelForm.error}/>
          :
            <Modal>
              <FormMain  value={modelForm.value} form={modelForm.form} parent={{form_id: form._id, record_id: record._id, field_id: modelForm.field_id }} parentrec={record} onComplete={modelForm.onComplete.bind(this)} inModal={true} crud="c"/>
          </Modal>   
      )}
    </div>
  )
}

export function FieldWithLabel ({field, value, edit, invalid, onChange}) {
  return (
    <div className="slds-col slds-col--padded slds-size--1-of-2 slds-medium-size--1-of-2 slds-x-small-size--1-of-1">
      <div className={`slds-form-element ${edit ? '' : 'field-seperator'} ${field.required ? 'slds-is-required' : ''} ${invalid ? 'slds-has-error' : ''}`}>
          <label className="slds-form-element__label">{field.title}</label>
          <div className="slds-form-element__control"  style={{marginLeft: edit ? '0' : "15px"}}>
            <span className={(edit || field.type ==="dropdown_options")? " " : " slds-form-element__static"}>
                <Field fielddef={field} value={value} edit={field.display === "readonly"? false : edit} onChange={onChange}/>
            </span>
            { invalid && <span className="slds-form-element__help">{invalid}</span> }
          </div>
      </div>
    </div>
  );
}

export function FieldWithoutLabel ({field, value, edit, fc, onChange}) {
  return (
    <div className={`slds-form-element__control ${field.required ? 'slds-is-required' : ''} ${fc.invalid ? 'slds-has-error' : ''}`}  >
      <span className={(edit || field.type === "dropdown_options")? " " : " slds-form-element__static"}>
          <Field fielddef={field} value={value} edit={field.display === "readonly"? false : edit} onChange={onChange} inlist={true}/>
      </span>
      { fc.invalid && <span className="slds-form-element__help">{fc.invalid}</span> }
    </div>
  );
}

// *** NEW ListPage
export function ListPage ({form, query}) {
  const [ value, setValue ] = useState({status: "wait", records: []})
  const f = DynamicForm.instance.getForm (form._id)

  useEffect(() => {
    _dataChanged()
  }, [form, query])

  function _dataChanged() {
    console.log (`ListPage: _dataChanged - query new record and set value`)
    const f = DynamicForm.instance.getForm (form._id)
    DynamicForm.instance.query (f._id, query && query).then(
      succRes => setValue({status: "ready", records: succRes}),
      errRes  => setValue({status: "error", message: JSON.stringify(errRes.error) })
    )
  }

  return (
    <div className="slds-grid slds-wrap">
      <div className="slds-col slds-size--1-of-1">
      { <FormHeader form={f} count={value.records ? value.records.length : 0} buttons={[{title: "New", action: {nav: {component: "RecordPage", formid: f._id, props: {"e": true}}}}]}/>
      }
      </div>
      { value.status === "error"?
        <div className="slds-col slds-size--1-of-1">
          <Alert type="error" message={value.message}/>
        </div>
      :
      <div className="slds-col slds-size--1-of-1">
        <ListMain noheader={true} value={value} form={f} onDataChange={_dataChanged}/>
      </div>
      }
    </div>
  )
}


/* --------------------------------------------------------------------------*/
export function ListMain ({form, inline, value, onDataChange, parent, parentrec, selected, noheader, title, viewonly}) {
  const [inlineCtl, setInlineCtl ] = useState(Object.assign({editidx: null, editval: {}}, inline? value : {}))
  const [editrow, setEditrow] = useState(false)

  useEffect(() => {
    console.log (`ListMain - useEffect - value changed`)
    // This is needed, as if we add a new embedded record to the list, the parent component (FormMain) will do the save, and send new value props
    setEditrow (false)
  }, [value]) // You can tell React to skip applying an effect if certain values haven’t changed between re-renders

  let listfields = form.fields ? form.fields.filter(m => m.display === 'list' || m.display === 'primary') : []
  /* KH- add "_id" field to form.store = 'metadata', so data can be used in Reference fields */
  if (inline && form.store === 'metadata') {
    listfields = [{name: '_id', display: 'list', title: 'Key', type: 'text', required: true}].concat(listfields)
  }

  function _ActionDelete (rowidx) {
    let row = value.records[rowidx];
    if (window.confirm("Sure?")) {

      DynamicForm.instance.delete (form._id, row._id, parent).then(succVal => {
        if (onDataChange) {
          // this will re-load the data at the parent, and in turn send new props
          onDataChange()
        }
      }, err => {
        alert (JSON.stringify(err))
      })
    }
  }

  function _ActionEdit (rowidx, view = false) {
    let records = value.records
    console.log ("ListMain _ActionEdit rowidx :" + rowidx + ", view : " + view);
    if (parent)
      if (rowidx >= 0) // edit existing row
        setEditrow({value: {status: "ready", record: records[rowidx]}, crud: view ? "r" : "u"})
      else // add new row
        setEditrow({value: {status: "ready", record: {}}, crud: "c"})
    else
      navTo("RecordPage", form._id, rowidx >= 0 && records[rowidx]._id,  !view ? {"e": true} : {});
  }

  /***************/
  /** inline  ****/
  function _inLinefieldChange(val) {
    let editval = Object.assign(inlineCtl.editval, val)
    _formControlState (DynamicForm.instance.appMeta, 1, {fields: listfields}, editval, undefined, parentrec).then(succval => {
      setInlineCtl((prev) => { return { ...prev, fc: succval.formctl, editval: editval}})
    })
  }

  function _inLineEdit(rowidx) {
    console.log ("ListMain _inLineEdit rowidx :" + rowidx);
    let records = inlineCtl.records,
        editval = (rowidx >= 0) ? Object.assign({}, records[rowidx]) : {}
    
    _formControlState (DynamicForm.instance.appMeta, 1, {fields: listfields}, editval, undefined, parentrec).then(succval => {
      setInlineCtl((prev) => { return { ...prev, editidx: rowidx, fc: succval.formctl, editval: editval}})
      if (onDataChange) onDataChange({disableSave : true});
    })
  }

  function _inLineDelete(rowidx) {
    let clonearray = inlineCtl.records.slice(0)
    clonearray.splice(rowidx, 1);
    console.log ("ListMain _delete rowidx:" + rowidx + ", result : " + JSON.stringify(clonearray));
    setInlineCtl({status: "ready", records: clonearray, editidx: null, editval: {}})
    if (onDataChange) onDataChange({data: clonearray, disableSave: false})

  }
  // Save or Cancel inline data row
  function _inLineSave(saveit) {
    console.log ("ListMain _inLineSave : saveit:"+saveit+" ["+ inlineCtl.editidx + "] : " + JSON.stringify(inlineCtl.editval));
    if (saveit) { // save
      let clonearray = inlineCtl.records.slice(0);
      if (inlineCtl.editidx >= 0) { // save existing row
        clonearray[inlineCtl.editidx] = inlineCtl.editval
      } else {// save a new row
        clonearray.push (inlineCtl.editval)
      }
      console.log ("ListMain _inLineSave : inform parent of new data, clonearray:" +JSON.stringify(clonearray));
      setInlineCtl({status: "ready", records: clonearray, editidx: null, editval: {}})
      if (onDataChange) onDataChange({data: clonearray, disableSave: false})

    } else { // cancel
      setInlineCtl((prev) => { return {...prev, editidx: null, editval: {}}}) //enque a render update
      if (onDataChange) onDataChange({disableSave: false})
    }
  }


  function _onFinished (val) {
    console.log ('ListMain _onFinished() ' + JSON.stringify(val));
    if (val) {
      if (onDataChange) {
        // this will re-load the data at the parent, and in turn send new props
        onDataChange();
      }
    } else {
      console.log ("ListMain _formDone() no data, must be cancel");
      setEditrow(false)
    }
  }

  // When used to select from a list
  function _handleSelect(id) {
    selected(id);
  }

  const records = inline? inlineCtl.records : value.records,
        buttons = selected ? [{title: "Cancel", action: {cb: selected.bind(this, false)}}] : [{title: "New", action: {cb: () => _ActionEdit(-1, false)}}]

  console.log (`ListMain - render:  [inline: ${inline}] [inlineCtl.records: ${JSON.stringify(inlineCtl.records)}] `) //:  + ${JSON.stringify(this.props.value)}`);

  return (
    <div className="">
      {  (!inline) && (!noheader) &&
        <SectionHeader title={title || form.name} buttons={buttons} />
      }
      <div className="box-bo dy table-resp onsive no-pad ding">
        <div className="slds-scrollable--x">
          <table className="slds-table slds-table--bordered">
            <thead>
              <tr className="slds-text-heading--label">
                { (!inline) &&
                <th className="slds-row-select" scope="col">
                  <label className="slds-checkbox" >
                    <input className="checkbox" type="checkbox"  />
                    <span className="slds-checkbox--faux"></span>
                    <span className="slds-form-element__label slds-assistive-text">select all</span>
                  </label>
                </th>
                }
                {listfields.map(function(field, i) { return (
                  <th key={i} scope="col">
                    <div  className="slds-truncate" style={{padding: ".5rem .0rem"}}>{field.title}</div>
                  </th>
                );})}

                { !viewonly &&
                <th className="slds-row-select" scope="col">
                  { inline ?
                  <span className="slds-truncate">
                    <button className="link-button" onClick={() => _inLineEdit(-1)} style={{marginRight: "5px"}}>
                      <SvgIcon spriteType="utility" spriteName="new" small={true}/>
                    </button>add
                  </span>
                  :
                  !selected && (
                    <span className="slds-truncate">del edit</span>
                  )
                  }
                </th>
                }

              </tr>
            </thead>
            <tbody>
              {[...Array((records? records.length : 0) + (inlineCtl.editidx === -1? 1 : 0))].map ((z,i) => {
                
                let edit = (i === inlineCtl.editidx || (inlineCtl.editidx === -1 && i === records.length)),
                    row = edit === true? inlineCtl.editval : records[i]  

                return (
                  <tr key={i} className="slds-hint-parent">
                    { !inline &&
                    <td className="slds-row-select">
                      <label className="slds-checkbox" >
                        <input className="select-row1" type="checkbox" />
                        <span className="slds-checkbox--faux"></span>
                        <span className="slds-form-element__label slds-assistive-text">select row1</span>
                      </label>
                    </td>
                    }

                    {listfields.map(function(field, fidx) {
                      let listfield =  <FieldWithoutLabel field={field} value={row[field.name]} edit={edit} onChange={_inLinefieldChange} fc={(edit && inlineCtl.fc)? inlineCtl.fc.flds[field.name] : {visible: true, invalid: false}}/>
                      if (field.display === "primary"  &&  !inline) {
                        if (parent )
                          return (
                          <td key={fidx}><button className="link-button" style={{color: "#0070d2", cursor: "pointer"}} onClick={() => _ActionEdit(i, true)}>{listfield}</button></td>);
                        else
                          return (
                          <td key={fidx}><Link component="RecordPage" formid={form._id} recordid={row._id}>{listfield}</Link></td>);
                      } else {
                        return (<td key={fidx}>{listfield}</td>);
                      }
                    })}

                    { !viewonly &&
                      <td className="slds-row-select">

                        { selected ?
                          <button className="slds-button slds-button--brand" onClick={() => _handleSelect(row)}>select </button>
                        :  edit ?
                          <div className="slds-button-group">
                            <button className="slds-button slds-button--brand" onClick={() => _inLineSave(true)} disabled={inlineCtl.fc.invalid}>Save </button>
                            <button className="slds-button slds-button--brand" onClick={() => _inLineSave(false)}>Cancel </button>
                          </div>
                        : inline ?
                          <div className="slds-button-group">
                            <button className="link-button" onClick={() => _inLineDelete(i)} style={{marginRight: "15px"}}><SvgIcon spriteType="utility" spriteName="clear" small={true}/>  </button>
                            <button className="link-button" onClick={() => _inLineEdit(i, false)} disabled={inlineCtl.editidx} ><SvgIcon spriteType="utility" spriteName="edit" small={true}/>  </button>
                        </div>
                        :
                          <div className="slds-button-group">
                            <button className="link-button" onClick={() => _ActionDelete(i)} style={{marginRight: "15px"}}><SvgIcon spriteType="utility" spriteName="clear" small={true}/>  </button>
                            <button className="link-button" onClick={() => _ActionEdit(i, false)} ><SvgIcon spriteType="utility" spriteName="edit" small={true}/>  </button>
                          </div>
                        }

                      </td>
                    }
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      { editrow &&
        <Modal>
            <FormMain  value={editrow.value} form={form} crud={editrow.crud} parent={parent} parentrec={parentrec} onComplete={_onFinished} inModal={true}/>
        </Modal>
      }
    </div>
  )
}

// Top Level UIComponent, props from URL
export function RecordPage ({form, e, xid}) {
  const [ value, setValue ] = useState(xid? {status: "wait", record: {}} : {status: "ready", record: {}})
  
  useEffect(() => {
    _dataChanged()
  }, [form, xid])

  function _dataChanged() {
    if (xid) {
      DynamicForm.instance.getIdsWithFormId(form._id, xid).then(
        succRes => {
          if (succRes) 
            setValue({status: "ready", record: succRes}) 
          else 
            setValue({status: "error", message: `record not found: [${xid}]` })
        },
        errRes  => setValue({status: "error", message: errRes.error })
      )
    }
  }

  console.log (`RecordPage: rendering form from props url [${form._id}], [record:${JSON.stringify(value)}]`)
  const f = DynamicForm.instance.getForm (form._id)
  if (!f) {
    return <Alert message={`RecordPage: formid not found [${form._id}]`}/>
  } else {
    const crud =  !xid? "c" : (e)?  "u" : "r"
    return (
      <div className="slds-grid slds-wrap">
        <div className="slds-col slds-size--1-of-1">
          { <FormHeader form={f}/>
          }
        </div>

        { value.status === "error" &&
          <div className="slds-col slds-size--1-of-1">
            <Alert message={value.message}/>
          </div>
        }
        { value.status !== "error" && [

          <div key="FormMain" className="slds-col slds-size--1-of-1 slds-medium-size--1-of-2">
              <FormMain key={form._id} value={value} form={f}  crud={crud} onDataChange={_dataChanged}/>
          </div>,

          <div key="childforms" className="slds-col slds-size--1-of-1 slds-medium-size--1-of-2">
            {crud === "r"  && value.status === "ready" && f.fields.filter(m => m.type === 'childform').map((field, i) => {
              let cform = field.child_form && DynamicForm.instance.getForm(field.child_form._id)
              if (!cform) 
                return <Alert key={`err${field.name}`} message={`RecordPage: no childform found in application : ${field.name}`}/>
              else return (
                <div key={`${cform._id}${i}`} style={{padding: "0.5em"}}>
                  <ListMain title={field.title} parent={{form_id: form._id, record_id: value.status === 'ready'? value.record._id : "new", field_id: field._id }} parentrec={value.record} form={cform} value={{status: value.status, records: value.status === "ready"? value.record[field.name] : []}} onDataChange={_dataChanged}/>
                </div>
              )
            })}
          </div>,
        
          <div key="relatedlists" className="slds-col slds-size--1-of-1 slds-medium-size--1-of-2">
            {crud === "r"  && value.status === "ready" && f.fields.filter(m => m.type === 'relatedlist').map((field, i) => {
              return (
              <div key={`${field.child_form._id}${i}`} style={{padding: "0.5em"}}>
                <ListPage  form={field.child_form} query={{[field.name]: {_id: value.record._id}}} />
              </div>
            );})}
          </div>
        ]}
      </div>
    )
  }
}
