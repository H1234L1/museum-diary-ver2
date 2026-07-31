// miniprogram_npm/edu-miniprogram-components/ai-popup/ai-popup.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    personality: {
      type: String,
      value: "正常"
    },
    content: {
      type: String,
      value: "一个博学的机器人助手。"
    },
    quickchat_1: {
      type: String,
      value: null
    },
    quickchat_2: {
      type: String,
      value: null
    },
    quickchat_3: {
      type: String,
      value: null
    },
    quickchat_4: {
      type: String,
      value: null
    },
    rag_1: {
      type: String,
      value: null
    },
    rag_2: {
      type: String,
      value: null
    },
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  lifetimes: {
    attached: function () {
      wx.getSystemInfo({
          success: function (res) {
              var h = res.windowHeight;
              var w = res.windowWidth;
              var chat_area_height = Math.floor(750/w*h-750);
              this.setData({chat_area_height, show: true});
          }.bind(this),
          fail: function (res) {
              this.setData({chat_area_height: 750, show: true});
          }.bind(this)
      });
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    updateChat: function (e) {
      this.setData({chat_history: e.detail.chat_history});
      this.setData({last_chat: "bottom"}); // 必须分开写
    }
  }
})