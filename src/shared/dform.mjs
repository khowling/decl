import jexl from 'jexl'
/*
 * mode
 * 0 - calculate visibility, and dynamic fields, based on form definition (for read/only client)
 * 1 - calculate visibility, default (new_change_rec), invalid and dynamic fields (for create/update client)
 * 2 - calculate invalid, validated_value and dynamic fields (for server save)
 * 
 * return {
 *  error: catastrophic error,
 *  new_change_rec = {<fld_name>: <val>,....}
 *  formctl: {
 *    invalid: true/false
 *    change: ??
*     flds: {
*       "<fld_name>": {
*          visible: true/false
*          new_change: "<change_rec + default value>"
*          new_change_from_default: true/false
*          error: <invalid error message>
*          validated_value: 

*          dynamic_fields: [{<field>}, {<field>}..]
*          flds: {
*            <fld_name>: {
*              visible: true/false
*              new_change: "<change_rec + default value>"
*              error: <invalid error message>
*              validated_value: 
*    } } } }
*/
export async function _formControlState(context, mode, form, existing_rec = {}, change_rec = {}, parentrec, prevFormCtl = null, mongoObjectId)  {
  const returnControl = {new_change_rec:{}, formctl: {flds:{}, invalid: false, change: prevFormCtl ? false : true}};

  async function calcFieldCtrl (form, fld, existing_rec, change_rec) {
    const eval_context = {rec: Object.assign({}, existing_rec, change_rec, {"_parent": parentrec}), context}
    let fctrl = {}

    console.log (`_formControlState: calcFieldCtrl fld: ${fld.name}`)//, exsting_rec: ${JSON.stringify(existing_rec)}, change_rec ${JSON.stringify(change_rec)}`)
    // --------------------  CALCULATE Visibility
    if(mode === 0 || mode === 1) {
      fctrl.visible = true
      if (fld.show_when) {
        try {
          fctrl.visible = await jexl.eval(fld.show_when, eval_context)
        } catch (e) {
          return {error: e}
        }
      }
    }

    console.log (`_formControlState calcFieldCtrl, fctrl.visible : ${fctrl.visible}`)
    //  --------------------  CALCULATE THE "new_change_rec" based on the field "default_value" (expression)
    
    if (mode === 1 && fctrl.visible) {
      console.log (`_formControlState - its visible, current val : ${change_rec[fld.name]}, prev val: ${prevFormCtl && prevFormCtl.flds[fld.name] && prevFormCtl.flds[fld.name].validated_value}, prev cal change: ${prevFormCtl && prevFormCtl.flds[fld.name] && prevFormCtl.flds[fld.name].new_change}`)
      // If the field is visible, and there is a default_value expression, AND if there is no current value in the field, or current change value has been set by previous default
      if (fld.default_value && !existing_rec[fld.name] && (!change_rec[fld.name] || (prevFormCtl && prevFormCtl.flds[fld.name] && (prevFormCtl.flds[fld.name].new_change_from_default && prevFormCtl.flds[fld.name].new_change === change_rec[fld.name])))) {
        try {
          fctrl.new_change = await jexl.eval(fld.default_value, eval_context) 
          fctrl.new_change_from_default = true
        } catch (e) {
          return {error: e}
        }
      } else if (!(change_rec[fld.name] == null)) { // test for null or undefined
        fctrl.new_change = change_rec[fld.name]
        fctrl.new_change_from_default = false
      }
    }
    console.log (`_formControlState calcFieldCtrl, new_change : ${fctrl.new_change}`)

    // --------------------  CALCULATE Field Validity
    if (mode === 1 || mode === 2) {
      const required_eval =  (fld.required == null)? false : (typeof fld.required === "boolean"? fld.required : await jexl.eval(fld.required, eval_context))
      console.log (`_formControlState calcFieldValidity ${fld.name}, required: ${required_eval}`)
      try {
        const fval = (mode === 1)? fctrl.new_change || existing_rec[fld.name] : change_rec.hasOwnProperty(fld.name)? change_rec[fld.name] : existing_rec[fld.name]
        console.log (`val to check ${fval}`)
        
        //Object.assign(fctrl,  await typecheckFn (appMeta, fld,  val, required_eval, mongoObjectId))
        //typecheckFn (appMeta, fld, fval, required_eval, mongoObjectId)

        if (fld.type === "dropdown_options") {
          if (fval && !Array.isArray(fval))
            fctrl.error = `data contains value of incorrect type ${fld.name}`
          else
            if (mode ===2) fctrl.validated_value = fval || null
        } else if (fld.type === "text" || fld.type === "textarea" || fld.type === "dropdown" || fld.type === "email" || fld.type === "formula" || fld.type === "secret") {
          if (fval && typeof fval !== 'string')
            fctrl.error = `data contains value of incorrect type ${fld.name}`
          else if (required_eval && !fval)
            fctrl.error = `required field missing ${fld.name}`
          else if (mode === 2) 
            fctrl.validated_value = fval || null
        } else if (fld.type === "boolean" ) {
          if (fval && typeof fval !== 'boolean')
            fctrl.error = `data contains value of incorrect type ${fld.name}`
          else if (required_eval && !fval)
            fctrl.error = `required field missing ${fld.name}`
          else if (mode === 2)  
            fctrl.validated_value = fval || false
        } else if (fld.type === "jsonarea") {
          if (fval && typeof fval !== 'string')
            fctrl.error = `data contains value of incorrect type ${fld.name}`
          else if (required_eval && !fval)
            fctrl.error = `required field missing ${fld.name}`
          else if (fval) 
            try {
              const validated_value = JSON.parse(fval)
              if (mode === 2)  fctrl.validated_value = validated_value
            } catch (e) { 
              fctrl.error = `Invalid json format ${fld.name}` 
            }
          else if (mode === 2)  
            fctrl.validated_value = null
        } else if (fld.type === "attachment" || fld.type === "image") {
          if (required_eval && !fval)
            fctrl.error = `Required field missing ${fld.name}`
          else if (fval && (typeof fval !== 'object' || !(fval.container_url && typeof fval.container_url === "string" && fval.filename && typeof fval.filename === "string")))
            fctrl.error = `Value of incorrect type ${fld.name}`
          else if (mode === 2) 
            fctrl.validated_value = fval ? {container_url: fval.container_url, filename: fval.filename} : null
        } else if (fld.type === "datetime") {
          if (fval && typeof fval !== 'string')
            fctrl.error = `Value of incorrect type ${fld.name}`
          else if (required_eval && !fval)
            fctrl.error = `Required field missing ${fld.name}`
          else if (fval) {
            const fdate = Date.parse(fval)
            if (isNaN(fdate))
              fctrl.error = `Invalid date format ${fld.name}`
            else if (mode === 2) 
              fctrl.validated_value = new Date(fdate)
          } else if (mode === 2)  
            fctrl.validated_value = null
        
          /*
          if (fval) try {
            if (mongoObjectId && !fval.startsWith("http")) {
              return {validated_value: new mongoObjectId(fval)};
            } else return {validated_value: fval};
          } catch (e) {  return {error: "data contains image field with invalid _id: " + fld.name + "  : " + fval};}
          else {
            if (fld.required) return {error: "required field missing : " + fld.name};
            return {validated_value:  null};
          }
          */
        } else  if (fld.type === "reference") {
          if (fval && typeof fval !== 'object')
            fctrl.error = `Value of incorrect type ${fld.name}`
          else if (required_eval && !fval)
            fctrl.error = `Required field missing ${fld.name}`
          else if (fval) {
            if (!fval._id) 
              fctrl.error = `Invalid format ${fld.name}`
            else {
              try {
                //console.log(`calcFieldCtrl - getForm : "${fld.search_form._id}|getForm(context)"`)
                const sform = fld.search_form &&  await jexl.eval(`"${fld.search_form._id}"|getForm(context)`, eval_context) //appMeta.find(f => f._id === fld.search_form._id)
                if (!sform) 
                  fctrl.error = `Reference field without defined search_form: ${fld.name}`
                else if (mode === 2) {
                  try {
                    fctrl.validated_value = {_id: sform.store === "mongo"? mongoObjectId.createFromHexString(fval._id) : fval._id} 
                  } catch (e) {
                    fctrl.error = `Invalid _id: ${fld.name}: ${fval._id}`
                  }
                }
              } catch (e) {
                fctrl.error = `Cannot find defined search_form: [field:${fld.name}]: ${JSON.stringify(fld.search_form)}`
              }
            }
          } else if (mode === 2)  
            fctrl.validated_value = null
        
        } else if (fld.type === "childform") {
          if (fval && mode !== 2)
            fctrl.error = `Data cannot contain childform data ${fld.name}`
          else if (fval && !Array.isArray(fval))
            fctrl.error = `Value of incorrect type ${fld.name}`
          else if (fval) {
            try {
              const cform = fld.child_form && await jexl.eval(`"${fld.child_form._id}"|getForm(context)`, eval_context) // appMeta.find(f => f._id === fld.child_form._id)
              if (!cform)
                fctrl.error = `Childform field without defined child_form: ${fld.name}`
              else if (mode === 2) // just retuen the array??
                fctrl.validated_value = fval
            } catch (e) {
              fctrl.error = `Cannot find defined child_form: [field:${fld.name}]: ${JSON.stringify(fld.child_form)}`
            }
          } else if (mode === 2)  
            fctrl.validated_value = null
        } else if (fld.type === "dynamic") {
          if (fval && typeof fval !== 'object') 
            fctrl.error = `Value of incorrect type ${fld.name}`
          else if (mode === 2)
            fctrl.validated_value = fval || null
        } else {
          fctrl.error = `Unknown field type ${fld.name} - ${fld.type}`
        }

      } catch (e) {
        console.error (`_formControlState calcFieldValidity ${fld.name}, error: ${e}`)
        return {error:e}
      } 
      console.log (`field ${fld.name}, typecheckFn`);
    }
    console.log (`_formControlState: calcFieldCtrl fld: ${fld.name}, return : ${JSON.stringify(fctrl)}`)
    return fctrl
  }


  console.log (`_formControlState processing form [${form.name}]`)
  // Will not validate childform field for modes 0 and 1, as the client will not save childform when editing the parent.
  // However, we should validate if its a server save, as full documents can be saved including childforms (for example when saving a new user with the 'provider' childform)
  for (let fld of form.fields.filter(f => (f.type !== 'childform' || mode === 2) && f.type !== 'relatedlist' && f.type !== 'button')) {
    console.log (`_formControlState processing form field [${fld.name}]`)
    try {
      const fctrl = await calcFieldCtrl (form, fld, existing_rec, change_rec)
      if (fctrl.error) 
        returnControl.formctl.invalid = true
      if (fctrl.new_change != null)
        Object.assign(returnControl.new_change_rec,{[fld.name]: fctrl.new_change})

      // ADDITIONAL CHECKING FOR EMBEDDED complex types
      // --------------------  CALCULATE dynamic
      if (fld.type === "dynamic") {
        console.log (`_formControlState expnding dynamic field ${fld.name}`)

        fctrl.flds = {}
        const eval_context = {rec: Object.assign({}, existing_rec, change_rec, {"_parent": parentrec}), context}
        console.log (`_formControlState expnding dynamic field eval: ${fld.fieldmeta_el}`)
        try {
          fctrl.dynamic_fields = await jexl.eval(fld.fieldmeta_el, eval_context)
          console.log ("dynamic_fields eval result : " + JSON.stringify(fctrl.dynamic_fields))
          if (fctrl.dynamic_fields) {
            if (fctrl.dynamic_fields.error) {
              fctrl.error = `error evaluating dynamic field expression [${fld.name}] : ${fld.fieldmeta_el}`
              //return {error: `error evaluating dynamic field expression [${fld.name}] : ${fld.fieldmeta_el}`}
            } else for (let dfld of fctrl.dynamic_fields.filter(f => (f.type !== 'childform' || mode === 2) && f.type !== 'relatedlist')) {
              console.log (`_formControlState processing dynamic field ${dfld.name}, existing_rec: ${JSON.stringify(existing_rec[fld.name])}`)
              let d_fctrl = await calcFieldCtrl ({fields: fctrl.dynamic_fields}, dfld, existing_rec[fld.name] ||{}, change_rec[fld.name] ||{})

              if (d_fctrl.error) 
                returnControl.formctl.invalid = true
              if (d_fctrl.new_change != null) {
                if (!returnControl.new_change_rec[fld.name]) returnControl.new_change_rec[fld.name] = {}
                Object.assign(returnControl.new_change_rec[fld.name],{[dfld.name]: d_fctrl.new_change})
              }

              fctrl.flds[dfld.name] = d_fctrl
            }
          }
        } catch(e) {
          console.warn (`_formControlState, error evaluating dynamic field expression ${fld.fieldmeta_el}, just ignoring : ${e}`)
        }
      }

      returnControl.formctl.flds[fld.name] = fctrl

    } catch (e) {
        return {error: e.message}
    }
    //else if (fld.type === '')

/*
    console.log (`fctrl ${fld.name}, show_when ${JSON.stringify(fctrl)}`);
    // check to see if form control state has changed from last time, if so, it will re-render the whole form!
    if (prevFormCtl && prevFormCtl.flds[fld.name]) {
      if (!Object.is(prevFormCtl.flds[fld.name].invalid, fctrl.invalid) ||
          !Object.is(prevFormCtl.flds[fld.name].visible, fctrl.visible) ||
          !Object.is(prevFormCtl.flds[fld.name].dynamic_fields, fctrl.dynamic_fields))
            returnControl.change = true;
    } else if (fctrl.invalid || !fctrl.visible) {
      // no current state, so much be change
      returnControl.change = true;
    }
*/
    
  }
  console.log ("FormMain _formControlState result");
  return returnControl;
}

/*
function typecheckFn (appMeta, fld, fval, required_eval, mongoObjectId)  {
  
  console.log (`typecheckFn: validating  ${fld.name} <${fld.type}> : ${fval}`)

  if (fld.type === "dropdown_options") {
    if (fval && !Array.isArray(fval))
      return {error: "data contains value of incorrect type : " + fld.name};
    else
      return {validated_value: fval || null};
  } else if (fld.type === "text" || fld.type === "textarea" || fld.type === "dropdown" || fld.type === "email" || fld.type === "formula" || fld.type === "secret") {
    if (fval && typeof fval !== 'string') return {error: "data contains value of incorrect type : " + fld.name};
    if (required_eval && (!fval)) return {error: "required field missing : " + fld.name};
    return {validated_value: fval || null};
  } else if (fld.type === "boolean" ) {
    if (fval && typeof fval !== 'boolean') return {error: "data contains value of incorrect type : " + fld.name};
    if (required_eval && (!fval)) return {error: "required field missing : " + fld.name};
    return {validated_value: fval || false};
  } else if (fld.type === "jsonarea") {
    if (fval) try {
      return {validated_value: JSON.parse(fval)}
    } catch (e) { return {error: "data contains invalid json format : " + fld.name}; }
    else
      return {validated_value:  null};
  } else if (fld.type === "attachment") {
    if (fval && (typeof fval !== 'object' || fval.name == null || fval.size <0 )) return {error: "data contains value of incorrect type : " + fld.name};
    return {validated_value: fval || null};
  } else if (fld.type === "datetime") {
    if (fval) {
      let fdate = Date.parse(fval);
      if (isNaN(fdate))
        return {error: "data contains invalid date format : " + fld.name};
      else
        return {validated_value: new Date(fdate)}
    } else {
      if (required_eval) return {error: "required field missing : " + fld.name};
      return {validated_value:  null}
    }
  } else if (fld.type === "image") {
    if (fval) {
      if (typeof fval !== 'object' || !(fval.container_url && typeof fval.container_url === "string" && fval.filename && typeof fval.filename === "string")) {
        return {error: "data contains invalid image format : " + fld.name}
      } else {
        return {validated_value:  fval}
      }
    } else return {validated_value:  null}
    *
    if (fval) try {
      if (mongoObjectId && !fval.startsWith("http")) {
        return {validated_value: new mongoObjectId(fval)};
      } else return {validated_value: fval};
    } catch (e) {  return {error: "data contains image field with invalid _id: " + fld.name + "  : " + fval};}
    else {
      if (fld.required) return {error: "required field missing : " + fld.name};
      return {validated_value:  null};
    }
    *
  } else  if (fld.type === "reference") {
    if (fval) {
      if (!fval._id) return {error: "data contains reference field with recognised _id: " + fld.name};


      const sform = fld.search_form && appMeta.find(f => f._id === fld.search_form._id)
      if (!sform) return {error: "data contains reference field without defined search_form: " + fld.name};

      if (sform.store === "mongo" && mongoObjectId) {
        try {
          return {validated_value:  {_id: mongoObjectId.createFromHexString(fval._id)} }
        } catch (e) {  return {error: "data contains reference field with invalid _id: " + fld.name + "  : " + fval._id + ", e: " + e};}
      } else {
        return {validated_value: {_id: fval._id}};
      }
    } else {
      if (required_eval) return {error: "required field missing : " + fld.name};
      return {validated_value:  null};
    }
  } else if (fld.type === "childform") {
    if (fval) {
      const cform = fld.child_form && appMeta.find(f => f._id === fld.child_form._id)
      if (!cform) return {error: "data contains childform field without defined child_form: " + fld.name};

      if (!Array.isArray(fval))
        return {error: "data contains childform field, but data is not array: " + fld.name};
      else
        return {validated_value: fval}
    } else {
      // if no childform value, just ignore, dont override existing values
      return {}
    }
  } else if (fld.type === "dynamic") {
    if (fval) {
      if (typeof fval !== 'object') 
        return {error: "data contains dynamic value of incorrect type : " + fld.name}
      else
        return {validated_value: fval}  
    } else {
      if (required_eval) return {error: "required field missing : " + fld.name};
      return {validated_value: null}
    }
  } else {
    return {error: `Unknown field type ${fld.name} - ${fld.type}`}
  }

}
*/