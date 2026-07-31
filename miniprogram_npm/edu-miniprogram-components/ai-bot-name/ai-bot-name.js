// components/ai-quickstart/ai-quickstart.js
Component({

    /**
     * 组件的属性列表
     */
    properties: {
        detail: {
            type: String,
            value: "机器人"
        }
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    lifetimes: {
        attached: function () {
            this.triggerEvent("initbot", {bot_name: this.properties.detail}, {bubbles:true, composed: true});
        }
    },

    /**
     * 组件的方法列表
     */
    methods: {
    }
})