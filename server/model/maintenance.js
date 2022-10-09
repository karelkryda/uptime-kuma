const { BeanModel } = require("redbean-node/dist/bean-model");
const { parseTimeObject, parseTimeFromTimeObject, isoToUTCDateTime, utcToISODateTime } = require("../../src/util");
const { isArray } = require("chart.js/helpers");
const { timeObjectToUTC, timeObjectToLocal } = require("../util-server");

class Maintenance extends BeanModel {

    /**
     * Return an object that ready to parse to JSON for public
     * Only show necessary data to public
     * @param {string} timezone If not specified, the timeRange will be in UTC
     * @returns {Object}
     */
    async toPublicJSON(timezone = null) {

        let dateRange = [];
        if (this.start_date) {
            dateRange.push(utcToISODateTime(this.start_date));
            if (this.end_date) {
                dateRange.push(utcToISODateTime(this.end_date));
            }
        }

        let timeRange = [];
        let startTime = parseTimeObject(this.start_time);
        timeRange.push(startTime);
        let endTime = parseTimeObject(this.end_time);
        timeRange.push(endTime);

        // Apply timezone offset
        if (timezone) {
            if (this.start_time) {
                timeObjectToLocal(startTime, timezone);
            }
            if (this.end_time) {
                timeObjectToLocal(endTime, timezone);
            }
        }

        let obj = {
            id: this.id,
            title: this.title,
            description: this.description,
            strategy: this.strategy,
            intervalDay: this.interval_day,
            active: !!this.active,
            dateRange: dateRange,
            timeRange: timeRange,
            weekdays: (this.weekdays) ? JSON.parse(this.weekdays) : [],
            daysOfMonth: (this.days_of_month) ? JSON.parse(this.days_of_month) : [],
        };

        if (!isArray(obj.weekdays)) {
            obj.weekdays = [];
        }

        if (!isArray(obj.daysOfMonth)) {
            obj.daysOfMonth = [];
        }

        return obj;
    }

    /**
     * Return an object that ready to parse to JSON
     * @param {string} timezone If not specified, the timeRange will be in UTC
     * @returns {Object}
     */
    async toJSON(timezone = null) {
        return this.toPublicJSON(timezone);
    }

    static jsonToBean(bean, obj, timezone) {
        if (obj.id) {
            bean.id = obj.id;
        }

        // Apply timezone offset to timeRange, as it cannot apply automatically.
        if (timezone) {
            if (obj.timeRange[0]) {
                timeObjectToUTC(obj.timeRange[0], timezone);
                if (obj.timeRange[1]) {
                    timeObjectToUTC(obj.timeRange[1], timezone);
                }
            }
        }

        bean.title = obj.title;
        bean.description = obj.description;
        bean.strategy = obj.strategy;
        bean.interval_day = obj.intervalDay;
        bean.active = obj.active;

        if (obj.dateRange[0]) {
            bean.start_date = isoToUTCDateTime(obj.dateRange[0]);

            if (obj.dateRange[1]) {
                bean.end_date = isoToUTCDateTime(obj.dateRange[1]);
            }
        }

        bean.start_time = parseTimeFromTimeObject(obj.timeRange[0]);
        bean.end_time = parseTimeFromTimeObject(obj.timeRange[1]);

        bean.weekdays = JSON.stringify(obj.weekdays);
        bean.days_of_month = JSON.stringify(obj.daysOfMonth);

        return bean;
    }

    /**
     * SQL conditions for active maintenance
     * @returns {string}
     */
    static getActiveMaintenanceSQLCondition() {
        return `

            (maintenance_timeslot.start_date <= DATETIME('now')
            AND maintenance_timeslot.end_date >= DATETIME('now')
            AND maintenance.active = 1)
            AND
            (maintenance.strategy = 'manual' AND active = 1)

        `;
    }
}

module.exports = Maintenance;