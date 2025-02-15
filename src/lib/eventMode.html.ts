import EventClass from "./event.class";
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { atomicCardConfig } from "../types";
import dayjs from "dayjs";
import { getCurrDayAndMonth, getMultiDayEventParts, isHtml } from "./common.html";
import { localize } from '../localize/localize';

/**
 * Gets the icon for a specific event
 * @param config card configuration
 * @param event event to get icon from
 * @returns TemplateResult with Icon
 */
export function getEventIcon(config: atomicCardConfig, event: EventClass) {
    const iconColor: string =
        typeof event.entityConfig.color != 'undefined' ? event.entityConfig.color : config.eventTitleColor;

    if (config.showEventIcon && event.entityConfig.icon != 'undefined')
        return html`<ha-icon class="eventIcon" style="color:  ${iconColor};" icon="${event.entityConfig.icon}"></ha-icon>`;
}

/**
 * Gets the title html for an event mode event
 * @param config card configuration
 * @param event event to get title html for
 * @returns TemplateResult containing title HTML
 */
export function getTitleHTML(config: atomicCardConfig, event: EventClass) {
    const titletext: string = event.title;
    const titleColor: string =
        typeof event.entityConfig.color != 'undefined' ? event.entityConfig.color : config.eventTitleColor;
    const dayClassEventRunning = event.isRunning ? `event-titleRunning` : `event-title`;
    const textDecoration: string = event.isDeclined ? 'line-through' : 'none';

    if (config.disableEventLink || event.htmlLink == 'undefined' || event.htmlLink === null)
        return html`
				<div style="text-decoration: ${textDecoration};color: ${titleColor}">
					<div class="${dayClassEventRunning}" style="--event-title-size: ${config.eventTitleSize}%">${getEventIcon(config, event)} ${titletext} ${getMultiDayEventParts(config, event)} </div>
				</div>
			`;
    else
        return html`
				<a href="${event.htmlLink}" style="text-decoration: ${textDecoration};" target="${config.linkTarget}">
					<div style="color: ${titleColor}">
						<div class="${dayClassEventRunning}" style="--event-title-size: ${config.eventTitleSize}%">${getEventIcon(config, event)} <span>${titletext} ${getMultiDayEventParts(config, event)} </span></div>
					</div>
				</a>
			`;
}

/**
 * generates the HTML for time until event
 * @param config card configuration
 * @param event event to get hours for
 * @returns TemplateResult containing hours text
 */
export function getHoursHTML(config: atomicCardConfig, event: EventClass) {
    const today = dayjs();
    if (event.isEmpty) return html`<div>&nbsp;</div>`;
    // full day events, no hours set
    // 1. Starts any day, ends later -> 'All day, end date'
    if (event.isAllDayEvent && event.isMultiDay && event.startDateTime.isAfter(today, 'day'))
        return html`
				${config.fullDayEventText}, ${config.untilText!.toLowerCase()}
				${getCurrDayAndMonth(event.endDateTime)}
			`;
    // 2 . Is full day event starting before today, ending after today
    else if (
        event.isAllDayEvent && event.isMultiDay &&
        (event.startDateTime.isBefore(today, 'day') || event.endDateTime.isAfter(today, 'day'))
    )
        return html`
				${config.fullDayEventText}, ${config.untilText!.toLowerCase()}
				${getCurrDayAndMonth(event.endDateTime)}
			`;
    // 3. One day only, or multiple day ends today -> 'All day'
    else if (event.isAllDayEvent) return html`${config.fullDayEventText}`;
    // 4. long term event, ends later -> 'until date'
    else if (event.startDateTime.isBefore(today, 'day') && event.endDateTime.isAfter(today, 'day'))
        return html`${config.untilText} ${getCurrDayAndMonth(event.endDateTime)}`;
    // 5.long term event, ends today -> 'until hour'
    else if (event.startTimeToShow.isBefore(today, 'day') && event.endDateTime.isSame(today, 'day'))
        return html`${config.untilText} ${event.endDateTime.format('LT')} `;
    // 6. starts today or later, ends later -> 'hour - until date'
    else if (!event.startDateTime.isBefore(today, 'day') && event.endDateTime.isAfter(event.startDateTime, 'day'))
        return html`
				${event.startDateTime.format('LT')}, ${config.untilText!.toLowerCase()}
				${getCurrDayAndMonth(event.endDateTime)} ${event.endDateTime.format('HH:mm')}
`;
    // 7. Normal one day event, with time set -> 'hour - hour'
    else return html`${event.startDateTime.format('LT')} - ${event.endDateTime.format('LT')} `;
}


/**
 * generate Event Location link HTML
 * @param config card configuration
 * @param event event to get location from
 * @returns TemplateResult containing location information
 */
export function getLocationHTML(config: atomicCardConfig, event: EventClass) {
    if (!event.location || !config.showLocation) {
        return html``;
    } else if (config.disableLocationLink) {
        return html`<div><ha-icon class="event-location-icon" style="--location-icon-color: ${config.locationIconColor}" icon="mdi:map-marker"></ha-icon>&nbsp;${event.address}</div>
        `;
    } else {
        const loc: string = event.location;
        const location: string = loc.startsWith('http') ? loc : 'https://maps.google.com/?q=' + loc;
        return html`<div>
            <a href=${location} target="${config.linkTarget}" class="location-link" style="--location-link-size: ${config.locationTextSize}%">
                <ha-icon class="event-location-icon" style="--location-icon-color: ${config.locationIconColor}" icon="mdi:map-marker"> </ha-icon>&nbsp;${event.address}
            </a>
        </div>`;
    }
}

/**
 * generate Event Relative Time HTML
 *
 */
export function getRelativeTime(event: EventClass) {
    const timeOffset = dayjs().utcOffset();
    const today = dayjs().add(timeOffset, 'minutes');
    if (event.isEmpty) return html``;
    else if (!event.startDateTime.isBefore(today, 'day'))
        return html`(${today.to(event.startDateTime.add(timeOffset, 'minutes'))})`;
}

/**
 *
 * For the first event, check the week of the year, if it matches
 * currentWeek, dont update, if it doesnt, update current week
 * and apply the html week if option showWeeks is set
 *
 * @param day events grouped by day
 * @param currentWeek week number
 * @returns TemplateResult with current week html
 */
export function getWeekNumberHTML(day: [EventClass], currentWeek: number) {
    var currentWeekHTML = html``
    if (currentWeek != day[0].startDateTime.week()) {
        currentWeek = day[0].startDateTime.week();
        currentWeekHTML = html`<div class="week-number">${localize('ui.common.week')} ${currentWeek.toString()}</div>`
        return { currentWeekHTML, currentWeek };
    } else {
        return { currentWeekHTML, currentWeek };
    }
}


export function getDescription(config: atomicCardConfig, event: EventClass) {
    if (config.showDescription && event.description) {
        var desc = event.description;
        if (isHtml(event.description)) {
            desc = unsafeHTML(event.description);
        }

        if (!isHtml(event.description) && config.descLength && event.description.length >= config.descLength) {
            desc = html`${event.description.slice(0, config.descLength)}`;
        }
        return html`<div class="event-right">
                        <div class="event-main">
                            <div class="event-description" style="--description-color: ${config.descColor}; --description-size: ${config.descSize}%">
                                ${desc}
                            </div>
                        </div>
                    </div>`;
    }
    return html``
}
