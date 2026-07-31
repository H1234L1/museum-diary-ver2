// components/ai-quickstart/ai-quickstart.js
Component({

    /**
     * 组件的属性列表
     */
    properties: {
        detail: {
            type: String,
            value: "你好"
        },
        color: {
            type: String,
            value: "#e7fedb"
        }
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    /**
     * 组件的方法列表
     */
    methods: {
        onTap: function () {
            this.triggerEvent("chat", {detail: this.properties.detail}, {bubbles:true, composed: true});
        }
    }
})