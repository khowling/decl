import React, {useState, useEffect} from 'react'
import DynamicForm from '../services/dynamicForm.js'
import {Modal, SvgIcon, Alert, UpdatedBy, Waiting } from '../components/utils.jsx'
import { Link} from '../components/router.jsx'
import {FieldAttachment} from '../components/dform_fields.jsx'
import {ListMain, FormMain}       from '../components/dform.jsx';

export function ECOMPage({form, query}) {
    const [ value, setValue ] = useState({status: "wait", records: []})

    useEffect(() => {
        _dataChanged()
      }, [form, query])
    
      function _dataChanged() {
        DynamicForm.instance.query (form._id, query && query, "all").then(
          succRes => setValue({status: "ready", records: succRes}),
          errRes  => setValue({status: "error", message: JSON.stringify(errRes.error) })
        )
      }

    return (
        <main id="mainContent" data-grid="container">
            <HeloItem img={"https://placehold.it/1259x472/2F2F2F/171717"} heading="Heading" description="subheading" price="999.99"/>

            <div className="m-hero"></div>

            { value.status === "error" &&
            <div className="slds-col slds-size--1-of-1">
                <Alert type="error" message={value.message}/>
            </div>
            }
            { value.status === "ready" && 
                <Item2Layout form={form} items={value.records}/>
            }

            <div data-grid="col-12 stack-3" className="m-hyperlink-group-content-placement">    
            </div>
            <div data-grid="col-12" className="m-product-placement f-device"> ... </div>
            <div data-grid="col-12" className="m-product-placement f-app"> ... </div>
        </main>
    )
}

export function ECOMItem ({form, xid}) {
    const [ value, setValue ] = useState(xid? {status: "wait", record: {}} : {status: "ready", record: {}})
  
    const f_cartitem = DynamicForm.instance.getFormByName("CartItem")
    console.log (`f_cartitem: ${f_cartitem.store}`)
    const f_cart = DynamicForm.instance.getFormByName("Cart")
    console.log (`f_cart: ${f_cart.store}`)
    const f_cart_items_field = f_cart.fields.find((f) => f.name === "items")
    console.log (`f_cart_items_field type: ${f_cart_items_field.type}`)

    useEffect(() => {
    _dataChanged()
    }, [form, xid])

    function _dataChanged() {
        if (xid) {
            DynamicForm.instance.getIdsWithFormId(form._id, xid).then(succRes => {
                DynamicForm.instance.save(f_cart._id, {"name": "tempcart"}).then(cart => {
                    setValue({status: "ready", record: succRes, cart})
                },
                errRes  => setValue({status: "error", message: errRes.error }))
            },
            errRes  => setValue({status: "error", message: errRes.error })
            )
        }
    }

    function _onFinished(res) {
        console.log (res)
    }

    if (value.status === "ready") {
        
        return (
        <main id="mainContent" data-grid="container">
        <div data-grid="col-12 pad-12x stack-2" className="m-hyperlink-group-content-placement">
            <div data-grid="col-6">
                <Item form={form} item={value.record} badge={true}/>
            </div>

            <div data-grid="col-6">

            <FormMain  value={{"status": "ready", "record": {"product": value.record}}} form={f_cartitem} crud="c" parent={{form_id: f_cart._id, record_id: value.cart._id, field_id: f_cart_items_field._id }} parentrec={value.cart} onComplete={_onFinished}/>
               
            </div>

        </div>

        <h2 data-grid="col-12" className="c-heading-4">Additional Information</h2>
        <hr className="divider"/>
        <AdditionalInfo/>
        </main>
    )
    } else return (
        <Waiting msg="loading..."/>
    )
}

function Item2Layout({items, form}) {
    return (
        <div className="m-content-placement" data-grid="col-12">
            <div data-grid="col-12 pad-6x stack-2">
                {
                items.map((item, idx) =>
                    <div key={idx} data-grid="col-6">
                        <Item form={form}  item={item} badge={true}/>
                    </div>
                )}
            </div>
        </div>
    )
}

export function AdditionalInfo() {
    return (
        <section className="m-additional-information" style={{"paddingTop": "0"}}>
            <div data-grid="col-12 stack-2">
                <div data-grid="col-6">
                    <div data-grid="col-6">
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Publisher</strong>
                            </li>
                            <li>Electronic Arts</li>
                            <li>Copyright &copy; 2016</li>
                        </ul>
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Release date</strong>
                            </li>
                            <li>11/4/15</li>
                        </ul>
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Approximate size</strong>
                            </li>
                            <li>00.00 GB</li>
                        </ul>
                    </div>
                    <div data-grid="col-6">
                        <div className="c-age-rating">
                            <img className="c-image" src="https://placehold.it/56x56" alt="Placeholder with grey background"/>
                            <p className="c-label">Teen</p>
                            <p className="c-paragraph">Suitable for 13+</p>
                            <div className="c-content-toggle">
                                <ul className="c-list f-bare f-lean" id="learn-more" data-f-expanded="false">
                                    <li>Blood and gore</li>
                                    <li>Adult themes</li>
                                </ul>
                                <button data-f-more="More" data-f-less="Less" data-f-show="0">More</button>
                            </div>
                        </div>
                        <div className="c-content-toggle">
                            <p id="content-toggle-target" data-f-expanded="false">
                                <strong>Permissions</strong>
                                Uses your location
                                Uses your webcam
                                Uses your microphone
                                
                            </p>
                            <button data-f-more="Show more" data-f-less="Show less" data-f-show="3">Show more</button>
                        </div>
                    </div>
                </div>
                <div data-grid="col-6">
                    <div data-grid="col-6">
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Multiplayer</strong>
                            </li>
                            <li>Online and local</li>
                        </ul>
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Coop</strong>
                            </li>
                            <li>Online and local</li>
                        </ul>
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>In-app purchases</strong>
                            </li>
                            <li>$0.99-$9.99</li>
                        </ul>
                    </div>
                    <div data-grid="col-6">
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Installation</strong>
                            </li>
                            <li>This game can be installed on up to 10 Windows 10 devices</li>
                        </ul>
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Languages supported</strong>
                            </li>
                            <li>English (United States)</li>
                        </ul>
                        <ul className="c-list f-bare f-lean">
                            <li>
                                <strong>Additional terms</strong>
                            </li>
                            <li>
                                <a href="https://www.getmwf.com" className="c-hyperlink">Store terms of use</a>
                            </li>
                        </ul>
                        <a href="https://www.getmwf.com" className="c-hyperlink">Report this app to Microsoft</a>
                    </div>
                </div>
            </div>
        </section>
    )
}

// https://www.microsoft.com/en-us/mwf/latest/modules/hero-item
export function HeloItem({img, heading, description, price}) {

    return (
        <section className="m-hero-item f-x-left f-y-top context-accessory theme-dark" itemScope="" itemType="https://schema.org/Product">
            <picture>
                <source srcSet="https://placehold.it/1600x600/2F2F2F/171717" media="(min-width: 1779px)"/>
                <source srcSet="https://placehold.it/1600x600/2F2F2F/171717" media="(min-width: 1400px)"/>
                <source srcSet={img} media="(min-width: 1084px)"/>
                <source srcSet="https://placehold.it/1083x609/2F2F2F/171717" media="(min-width:768px)"/>
                <source srcSet="https://placehold.it/767x431/2F2F2F/171717" media="(min-width:540px)"/>
                <source srcSet="https://placehold.it/539x303/2F2F2F/171717" media="(min-width:0)"/>
                <img srcSet={img} src={img} alt="Placeholder with grey background and dimension watermark without any imagery"/>
            </picture>
            <div>
                <div>
                    <h1 className="c-heading">{heading}</h1>
                    <p className="c-subheading">{description}</p>
                    <div className="c-price" itemProp="offers" itemScope="" itemType="https://schema.org/Offer">
                        <meta itemProp="priceCurrency" content="GBP"/>
                        <span>£</span>
                        <span itemProp="price">{price}</span>
                        <link itemProp="availability" href="https://schema.org/InStock"/>
                    </div>
                    <div>
                        <a href="#" className="c-call-to-action c-glyph">
                            <span>Call To Action</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
function Item({form, item, badge}) {
    return (
        <section className="m-content-placement-item f-size-large">
            <picture>
                <FieldAttachment value={item.thumb}/>
            </picture>
            <div>
                { badge && <strong className="c-badge f-small f-highlight">BADGE</strong> }
                <h3 className="c-heading">{item.label}</h3>
                <p className="c-paragraph">{item.description}</p>
                <Link className="c-call-to-action c-glyph" component="ECOMItem" formid={form._id} recordid={item._id}>
                    <span>Add to Cart</span>
                </Link>
                
            </div>
        </section>
    )
}


