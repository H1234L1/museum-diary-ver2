// components/ai-quickstart/ai-quickstart.js
Component({

    /**
     * 组件的属性列表
     */
    properties: {
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    lifetimes: {

    },

    /**
     * 组件的方法列表
     */
    methods: {
        send: function () {
            this.triggerEvent(
                "chat", {detail: this.data.value}, 
                {bubbles:true, composed: true}
            );
            this.setData({value: ""});
        }
    }
})