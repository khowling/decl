
import React, {Component} from 'react';
import Velocity from 'velocity-animate';
import 'velocity-animate/velocity.ui';
import {SvgIcon} from './utils.jsx';

class TimeLineItem extends Component {

  render() {
    return (
      <li className="slds-timeline__item">
        <span className="slds-assistive-text">{this.props.type}</span>
        <div className="slds-media slds-media--reverse">
          <div className="slds-media__figure">
            <div className="slds-timeline__actions">
              <p className="slds-timeline__date">{this.props.due}</p>
              <button className="slds-button slds-button--icon-border-filled">
                <SvgIcon spriteType="utility" spriteName="switch" classOverride="slds-button__icon"/>
                <span className="slds-assistive-text">Switch</span>
              </button>
            </div>
          </div>
          <div className="slds-media__body">
            <div className={"slds-media slds-media--timeline slds-timeline__media--"+this.props.type.replace("log_a_","")}>
              <div className="slds-media__figure">
                <SvgIcon spriteType="standard" spriteName={this.props.type} classOverride="slds-button__icon"/>
              </div>
              <div className="slds-media__body">
                <div className="slds-tile">
                  <div className="slds-grid wrap">
                    <div className="slds-col slds-size--1-of-1 slds-text-body--regular">
                      <p className="slds-truncate">
                        <a href="/#">{this.props.title}</a>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="slds-truncate">{this.props.desc}</p>
                { this.props.type === "event" ?
                  <span>
                  <ul className="slds-list--horizontal slds-text-body--small">
                    <li className="slds-list__item slds-m-right--large">
                      <dl className="slds-dl--inline">
                        <dt className="slds-dl--inline__label" style={{float: "left", clear: "left"}}>Time:</dt>
                        <dd className="slds-dl--inline__detail" style={{float: "left", paddingLeft: "0.25rem"}}><a href="/#">Feb 23, 2015 11:00am–12:00pm</a></dd>
                      </dl>
                    </li>
                    <li className="slds-list__item">
                      <dl className="slds-dl--inline">
                        <dt className="slds-dl--inline__label" style={{float: "left", clear: "left"}}>Location:</dt>
                        <dd className="slds-dl--inline__detail" style={{float: "left", paddingLeft: "0.25rem"}}><a href="/#">300 Pike St, San Francisco CA</a></dd>
                      </dl>
                    </li>
                  </ul>
                  <dl className="slds-dl--inline slds-text-body--small">
                    <dt className="slds-dl--inline__label" style={{float: "left", clear: "left"}}>Name:</dt>
                    <dd className="slds-dl--inline__detail" style={{float: "left", paddingLeft: "0.25rem"}}><a href="/#">Lei Chan</a>, <a href="/#">Jason Dewar</a>, <a href="/#">Gwen Jones</a> and <a href="/#">Pete Schaffer</a></dd>
                  </dl>
                  </span>
                :
                  <ul className="slds-list--horizontal slds-text-body--small">
                    <li className="slds-list__item slds-m-right--large">
                      <dl className="slds-dl--inline">
                        <dt className="slds-dl--inline__label" style={{float: "left", clear: "left"}}>To:</dt>
                        <dd className="slds-dl--inline__detail" style={{float: "left", paddingLeft: "0.25rem"}}>
                          <a href="/#">Lei Chan</a>
                        </dd>
                      </dl>
                    </li>
                    <li className="slds-list__item">
                      <dl className="slds-dl--inline">
                        <dt className="slds-dl--inline__label" style={{float: "left", clear: "left"}}>From:</dt>
                        <dd className="slds-dl--inline__detail" style={{float: "left", paddingLeft: "0.25rem"}}>
                          <a href="/#">Jason Dewar</a>
                        </dd>
                      </dl>
                    </li>
                  </ul>
                }
              </div>
            </div>
          </div>
        </div>
      </li>
    )
  }
}


export  class TimeLine extends Component {

  componentDidMount() {

    Velocity.animate(
      this.refs.timeline.children,
      "transition.slideLeftIn", { stagger: 50 });

  }

  render() {
    return (
<div>

<ul className="slds-timeline" ref="timeline">
  <TimeLineItem type="email" title="Updated Proposal" due="Feb 24" desc="Hi guys, Thanks for meeting with the team today and going through the proposals we saw. This goes on
    until it&apos;s truncated."></TimeLineItem>
  <TimeLineItem type="task" title="Review proposals for EBC deck with larger team and have marketing review this" due="Feb 24" desc=""></TimeLineItem>
  <TimeLineItem type="event" title="Tesla &#x2014; EBC Meeting" due="Feb 24" desc="Let&apos;s get together to review the theater&apos;s layout and facilities. We&apos;ll also discuss
    potential things that truncate at a certain width."></TimeLineItem>
  <TimeLineItem type="log_a_call" title="Mobile conversation on Monday" due="Feb 24" desc="Lei seemed interested in closing this deal quickly! Let&apos;s move move."></TimeLineItem>

</ul>
</div>
    )
  }
}
TimeLine.navProps = {name: 'my day', icon: 'event', nav: TimeLine.name};
