// components/ai-group/ai-group.js
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
        attached: function () {
            this.data.chat_history = [];
        }
    },

    /**
     * 组件的方法列表
     */
    methods: {
        add_to_his: function (role, name, text) {
            var his = this.data.chat_history;
            his.push({
                sender_type: role,
                sender_name: name,
                text: text
            });
            this.data.chat_history = his;
            this.triggerEvent("updatechat", {
                chat_history: his
            });
        },

        send: function () {
            var bot_name = this.data.bot_name || "机器人";
            var content = this.data.content || "这是一个机器人。";
            var messages = JSON.parse(JSON.stringify(this.data.chat_history));
            var personality = this.data.personality;
            if (personality) {
                var text = messages.slice(-1)[0].text;
                text = text+"。用"+personality+"的性格回答。";
                messages[messages.length-1].text = text;
            }

            wx.serviceMarket.invokeService({
                async: "false",
                service: "wx1ef79fe5f143a445",
                api: "ChatCompletionPro",
                data: {
                    model: "abab5.5-chat",
                    tokens_to_generate: 1024,
                    temperature: 0.9,
                    top_p: 0.95,
                    stream: false,
                    reply_constraints: {
                    sender_type: "BOT",
                    sender_name: bot_name
                },
                messages: messages,
                bot_setting: [{
                    bot_name: bot_name,
                    content: content
                }]},
                client_msg_id: "1",

                success: function (res) {
                    var requestId = res.requestId;
                    var itv = setInterval(async function () {
                        var res = await wx.serviceMarket.getAsyncResult({requestId});
                        if (res.status==0) {
                            console.log(res);
                            this.add_to_his("BOT", bot_name, res.data.reply);
                            console.log(res);
                            clearInterval(itv);
                        } else {
                            console.log(res);
                        }
                    }.bind(this), 2000);
                }.bind(this),
                fail: function (res) {
                    this.add_to_his("BOT", bot_name, "链接失败");
                    console.error(res);
                }.bind(this),

            });

        },

        onChat: function (e) {
            this.add_to_his("USER", "我", e.detail.detail);
            this.send(e.detail.detail);
        },

        onInitBot: function (e) {
            for (var k in e.detail) this.data[k] = e.detail[k];
        },

        onAddRag: function (e) {
            var rag = {
                sender_type: "USER",
                sender_name: "RAG",
                text: e.detail.detail
            };
            this.data.chat_history.push(rag);
            wx.showToast({title: "知识库已添加", icon: "none"});
        }
    }
})