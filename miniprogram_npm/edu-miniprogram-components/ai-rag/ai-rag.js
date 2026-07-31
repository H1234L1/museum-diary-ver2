// components/ai-rag/ai-rag.js
Component({

    /**
     * 组件的属性列表
     */
    properties: {
        "name": {
            type: String,
            value: ""
        },
        "detail": {
            type: String,
            value: ""
        },
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    lifetimes: {
        attached: function () {
            this.triggerEvent("addrag", {
                name: this.properties.name,
                detail: this.properties.detail
            }, {bubbles: true, composed: true});
        }
    },

    /**
     * 组件的方法列表
     */
    methods: {

    }
})