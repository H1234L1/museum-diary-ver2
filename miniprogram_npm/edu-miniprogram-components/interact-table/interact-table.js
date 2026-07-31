Component({
    properties: {
        title: {
            type: String,
            value: "标题"
        },

        width: {
            type: String,
            value: "700rpx"
        },

        height: {
            type: String,
            value: "auto"
        },

        keys: {
            type: Array,
            value: null
        },
                
        records: {
            type: Array,
            value: null
        },

        globalStorage: {
            type: String,
            value: null
        },

        hideHeader: {
            type: Boolean,
            value: false
        },

        hidden: {
            type: Boolean,
            value: false
        },

        transpose: {
            type: Boolean,
            value: false
        },

        showAddButton: {
            type: Boolean,
            value: false
        },
    },

    data: {

    },

    lifetimes: {
        attached: function (options) {
            const app = getApp();

            const records = 
                this.properties.records
                || app.globalData.edu_data[this.properties.globalStorage].records;
            const old_records = JSON.parse(JSON.stringify(records));
            const keys =
                this.properties.keys
                || app.globalData.edu_data[this.properties.globalStorage].keys;
            
            var table_style = "";
            table_style += "width:"+String(this.properties.width)+";";
            if (this.properties.hidden) table_style += "display:none;";
            
            var content_style = ""
            content_style += "height:"+String(this.properties.height)+";";
            var width = 0;
            const l = keys.length;
            for (var i=0; i<l; i++) {
                width += keys[i].width;
            }
            
            this.setData({
                keys, records, table_style, old_records, content_style,
                is_input_number: false,
                is_input_string: false,
                scroll_left: 0,
            });

            if (this.properties.transpose) {
                var column_width_t = keys[0].width;
                var table_width = this.properties.width;
                var content_width = Number(table_width.substr(0, table_width.length-3))-Number(column_width_t.substr(0, column_width_t.length-3));
                content_width = String(content_width) + "rpx";
                content_style += "width:"+content_width+";";
                
                var header_style_t = "";
                header_style_t += "width:"+column_width_t+";";
                if (this.properties.height) {
                    header_style_t += "height:"+this.properties.height+";";
                }
                
                this.setData({column_width_t, content_style, header_style_t});

                console.log(this.data.header_style_t)
            }

            this.recordsUpdate(false);
        }
    },

    methods: {
        recordsUpdate: function (trigger_event=true) {
            console.log("updating");
            const s1 = JSON.stringify(this.data.records);
            const s2 = JSON.stringify(this.data.old_records);
            var is_same = s1==s2;
            if (is_same) { return; }
            this.data.old_records = JSON.parse(JSON.stringify(this.data.records));

            if (this.properties.globalStorage) {
                const app = getApp();
                if (!app.globalData.edu_data) app.globalData.edu_data = {};
                if (!app.globalData.edu_data[this.properties.globalStorage]) {
                    app.globalData.edu_data[this.properties.globalStorage] = {};
                    app.globalData.edu_data[this.properties.globalStorage].keys = this.data.keys;
                }
                app.globalData.edu_data[this.properties.globalStorage].records = this.data.records;
            }
            const detail = { records: this.data.records };
            if (trigger_event) this.triggerEvent("recordsupdate", detail);
        },

        onScrollSync: function (e) {
            this.setData({ scroll_left: e.detail.scrollLeft });
        },

        onScrollSyncT: function (e) {
            this.setData({ scroll_top: e.detail.scrollTop });
        },

        onCellTap: function (e) {
            const cell_type = this.data.keys[e.target.dataset.j].type;
            switch (cell_type) {
                case Number:
                    this.setData({ is_input_number: true });
                    break;
                case String:
                    this.setData({ is_input_string: true });
                    break;
            }
            this.setData({
                input_i: e.target.dataset.i,
                input_j: e.target.dataset.j
            });
        },

        onInputConfirm: function () {
            const records = this.data.records;
            console.log(this.data.keys[this.data.input_j]);
            switch (this.data.keys[this.data.input_j].type) {
                case Number:
                    records[this.data.input_i][this.data.keys[this.data.input_j].name] = Number(this.data.input_value);
                    break;
                case String:
                    records[this.data.input_i][this.data.keys[this.data.input_j].name] = String(this.data.input_value);
                    break;
                default:
                    records[this.data.input_i][this.data.keys[this.data.input_j].name] = String(this.data.input_value);
            }
            
            this.setData({
                records,
                input_value: null,
                is_input_number: false,
                is_input_string: false,
                input_i: null,
                input_j: null
            });

            this.recordsUpdate();
        },

        onInputCancel: function () {
            this.setData({
                is_input_number: false,
                is_input_string: false,
                input_i: null,
                input_j: null
            });
        },

        onInput: function (e) {
            this.setData({input_value: e.detail.value});
        },

        onAddRecord: function (e) {
            this.addRecord(e);
        },

        addRecord: function (e) {
            var records = this.data.records;
            var keys = this.data.keys;
            var new_record = {};
            for (var i=0; i<keys.length; i++) {
                new_record[keys[i].name] = "";
            }
            records.push(new_record);
            this.setData({ records });
            
            this.recordsUpdate();
        },

        getCell: function (order, keyname) {
            const record = this.data.records[order];
            return record[keyname];
        },

        setCell: function (order, keyname, value) {
            const records = this.data.records;
            records[order][keyname] = value;
            this.setData({ records });

            this.recordsUpdate();
        },

        getKey: function (keyname) {
            var ret = [];
            const l = this.data.records.length;
            for (var i=0; i<l; i++) {
                ret.push(this.data.records[i][keyname]);
            }
            return ret;
        },

        setKey: function (keyname, arr) {
            const records = this.data.records;
            const l = Math.min(records.length, arr.length);
            for (var i=0; i<l; i++) {
                records[i][keyname] = arr[i];
            }
            this.setData({ records });
            
            this.recordsUpdate();
        },

        addition: function (key1, key2) {
            var ret = [];
            if (typeof(key1)=="string") key1 = this.getKey(key1);
            if (typeof(key2)=="string") key2 = this.getKey(key2);

            const l = Math.min(key1.length, key2.length);
            for (var i=0; i<l; i++) {
                ret.push(key1[i]+key2[i]);
            }
            return ret;
        },
        add: function (key1, key2) { return this.addition(key1, key2); },
        jia: function (key1, key2) {
            console.log("Please use addition or add instead of jia.");
            return this.addition(key1, key2);
        },

        subtraction: function (key1, key2) {
            var ret = [];
            if (typeof(key1)=="string") key1 = this.getKey(key1);
            if (typeof(key2)=="string") key2 = this.getKey(key2);

            const l = Math.min(key1.length, key2.length);
            for (var i=0; i<l; i++) {
                ret.push(key1[i]-key2[i]);
            }
            return ret;
        },
        sub: function (key1, key2) { return this.subtraction(key1, key2); },
        jian: function (key1, key2) {
            console.log("Please use subtraction or sub instead of jian.");
            return this.subtraction(key1, key2);
        },
        
        multiplication: function (key1, key2) {
            var ret = [];
            if (typeof(key1)=="string") key1 = this.getKey(key1);
            if (typeof(key2)=="string") key2 = this.getKey(key2);

            const l = Math.min(key1.length, key2.length);
            for (var i=0; i<l; i++) {
                ret.push(key1[i]*key2[i]);
            }
            return ret;
        },
        multi: function (key1, key2) { return this.multiplication(key1, key2); },
        cheng: function (key1, key2) {
            console.log("Please use mutiplication or multi instead of cheng.");
            return this.multiplication(key1, key2);
        },
        
        division: function (key1, key2) {
            var ret = [];
            if (typeof(key1)=="string") key1 = this.getKey(key1);
            if (typeof(key2)=="string") key2 = this.getKey(key2);
            
            const l = Math.min(key1.length, key2.length);
            for (var i=0; i<l; i++) {
                ret.push(key1[i]/key2[i]);
            }
            return ret;
        },
        div: function (key1, key2) { return this.division(key1, key2); },
        chu: function (key1, key2) {
            console.log("Please use divison or div instead of chu.");
            return this.division(key1, key2);
        },

        summation: function (key) {
            const records = this.data.records;
            var l = records.length;
            var ret = 0;
            if (typeof(key)=="string") key = this.getKey(key);
            for (var i=0; i<l; i++) {
                ret += key[i];
            }
            return ret;
        },
        sum: function (key) { return this.summation(key); },
        he: function (key) {
            console.log("Please use summation or sum instead of he.")
            return this.summation(key);
        },

        avarage: function (key) {
            var l = this.data.records.length;
            return this.sum(key)/l;
        },
        avg: function (key) { return this.avarage(key); },
        pingjun: function (key) {
            console.log("Please use avarage or avg instead of pingjun.")
            return this.avarage(key);
        },

        median: function (key) {
            const records = this.data.records;
            var l = records.length;
            if (typeof(key)=="string") key = this.getKey(key);
            key = key.sort();
            if (l%2) return key[(l+1)/2];
            return (key[l/2-1]+key[l/2])/2;
        },
        zhongweishu: function (key) {
            console.log("Please use median instead of zhongweishu.")
            return this.median(key);
        },

        minimal: function (key) {
            if (typeof(key)=="string") key = this.getKey(key);
            return Math.min(...key);
        },
        min: function (key) { return this.minimal(key); },
        zuixiaozhi: function (key) {
            console.log("Please use minimal or min instead of zuixiaozhi.")
            return this.minimal(key);
        },

        maximum: function (key) {
            if (typeof(key)=="string") key = this.getKey(key);
            return Math.max(...key);
        },
        max: function (key) { return this.maximum(key); },
        zuidazhi: function (key) {
            console.log("Please use maximum or max instead of zuidazhi.")
            return this.maximum(key);
        },

        sort: function (key, reverse=false, update=true) {
            const records = this.data.records;
            records.sort((a, b) => {
                if (a[key]==b[key]) { return 0; }
                if(a[key]<b[key]^reverse) { return -1; }
                if(a[key]>b[key]^reverse) { return 1; } 
            });
            if (update) {
                this.setData({ records });
                this.recordsUpdate();
            }
            return records;
        },

        countif: function (key, condition) {
            var cnt = 0;
            const arr = this.getKey(key);
            for (var i in arr) {
                if (condition(arr[i])) cnt++;
            }
            return cnt;
        },

        map: function(key, min, max){
            var ex_min = this.min(key);
            var ex_max = this.max(key);
            if (ex_min==ex_max) { ex_min, ex_max = min, max; }
            var ex_range = ex_max - ex_min;
            var ex_d = 0;
            var range = max - min;
            var d = 0;
            var l = this.data.records.length;
            var ret = [];
            key = this.getKey(key);

            for(var i=0;i<l;i++){
                ex_d = key[i]-ex_min;
                d = ex_d*range/ex_range;
                ret.push(min+d);
            }
            return ret;
        },

        find: function () {
            const records = this.data.records;
            if (typeof(arguments[0])=="function") {
                var ret = records.find(arguments[0]);
                return ret;
            } else {
                var ret = records.find((e)=>{return e[arguments[0]]==arguments[1]});
                return ret;
            }
        },

        filter: function () {
            const records = this.data.records;
            if (typeof(arguments[0])=="function") {
                var ret = records.filter(arguments[0]);
                return ret;
            } else {
                var ret = records.filter((e)=>{return e[arguments[0]]==arguments[1]});
                return ret;
            }
        },
    }
})