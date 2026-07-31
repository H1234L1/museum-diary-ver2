// components/turtlecanvas/turtle-canvas.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    repl: {
      type: Boolean,
      value: false
    },
    width: {
      type: Number,
      value: 600
    },
    height: {
      type: Number,
      value: 300
    },
    backgroundColor: {
      type: String,
      value: "#EEEEEE"
    },
    backgroundImage: {
      type: String,
      value: null
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    ani_queue: [],
    canvas_style: "",

    fps: 30,

    speed: 3,
    heading: 0,
    shape: "default"
  },

  /**
   * 组件的生命周期
   */
  lifetimes: {
    attached: function (options) {
      var canvas_style = "";
      canvas_style += "width:"+String(this.properties.width)+"rpx;";
      canvas_style += "height:"+String(this.properties.height)+"rpx;";
      var icon_style = "";
      icon_style += "width:"+String(this.properties.width)+"rpx;";
      icon_style += "height:"+String(this.properties.height)+"rpx;";
      icon_style += "position: relative;"
      icon_style += "top:"+String(-this.properties.height)+"rpx;";
      var container_style = "";
      container_style += "width:"+String(this.properties.width)+"rpx;";
      container_style += "height:"+String(this.properties.height)+"rpx;";
      container_style += "border-style: solid;";
      container_style += "border-width: 2rpx;";
      var repl_style = "";
      var repl_value = "";
      repl_style += "min-width:" + String(this.properties.width-240) + "rpx;"
      this.setData({canvas_style, icon_style, container_style, repl_style, repl_value});

      var x = this.properties.width/2;
      var y = this.properties.height/2;
      this.setData({x, y});

      var ani_ptr = 0;
      var cur_ani = null;
      this.setData({ ani_ptr, cur_ani });

      this.data.isvisible = true;

      const query1 = wx.createSelectorQuery();
      query1
        .in(this)
        .select("#turtlecanvas")
        .fields({ node: true, size: true })
        .exec(function (res) {
          const canvas = this.data.canvas = res[0].node;
          const ctx = this.data.ctx = canvas.getContext("2d");
          canvas.width = this.properties.width;
          canvas.height = this.properties.height;
          
          ctx.fillStyle = this.properties.backgroundColor;
          ctx.fillRect(0,0,this.properties.width,this.properties.height);
          ctx.fillStyle = "black";
          
          this.data.x = this.properties.width/2;
          this.data.y = this.properties.height/2;
          
          ctx.moveTo(this.data.x, this.data.y);
          this.data.move = ctx.lineTo.bind(ctx);
        }.bind(this));
        
      const query2 = wx.createSelectorQuery();
      query2
        .in(this)
        .select("#turtleicon")
        .fields({ node: true, size: true })
        .exec(function (res) {
          const canvas = res[0].node;
          this.data.iconctx = canvas.getContext("2d");
          canvas.width = this.properties.width;
          canvas.height = this.properties.height;
        }.bind(this));

      setTimeout(function () {
        setInterval(this.draw.bind(this), 1000/this.data.fps);
        if (this.properties.backgroundImage) {
          const img = {x: 0, y: 0, width: this.properties.width, height: this.properties.height, src: this.properties.backgroundImage};
          this.draw_image(img);
        }
      }.bind(this), 500);
    },
  },

  /**
   * 组件的方法
   */
  methods: {
    quickValue: function () {
      var x = this.data.width/2, y = this.data.height/2, d = 0;
      const last = this.data.ani_queue[this.data.ani_queue.length-1];
      if (last) {
        x = last.value.x;
        y = last.value.y;
        d = last.value.d;
      }
      return {x,y,d};
    },

    draw: function () {
      if (this.data.ani_ptr>=this.data.ani_queue.length) return;
      this.drawTrack();
      if (this.data.isvisible) this.drawTurtle();
    },

    drawTurtle: function () {
      const shapes = {
        default: [
          {dx:-16, dy:-8},
          {dx:-12, dy:0},
          {dx:-16, dy:8},
          {dx:0, dy:0},
        ],
        diamond: [
          {dx:-8, dy:-8},
          {dx:-16, dy:0},
          {dx:-8, dy:8},
          {dx:0, dy:0},
        ]
      };
      const shape = shapes[this.data.shape];
      const ctx = this.data.iconctx;
      ctx.clearRect(0, 0, this.data.width, this.data.height);
      
      ctx.beginPath();
      ctx.moveTo(this.data.x, this.data.y);
      for (var i=0; i<shape.length; i+=1) {
        const x = shape[i].dx;
        const y = shape[i].dy;
        var rad = this.data.heading/180*Math.PI;
        const x_rot = this.data.x+x*Math.cos(rad)+y*Math.sin(rad);
        const y_rot = this.data.y+y*Math.cos(rad)-x*Math.sin(rad);
        ctx.lineTo(
          x_rot,
          y_rot
        );
      }
      ctx.fill();
      ctx.stroke();
    },

    drawTrack: function () {
      while (true) {
        const ctx = this.data.ctx;
        var ani = this.data.cur_ani;
        if (!ani) {
          this.data.cur_ani = ani = 
          JSON.parse(JSON.stringify(this.data.ani_queue[this.data.ani_ptr]));
        }
        
        var dpf = 999999;
        var degpf = 999999;
        if (this.data.speed!=0) {
          dpf = 200*this.data.speed/this.data.fps;
          degpf = 180*this.data.speed/this.data.fps;
        }
        
        switch (ani.type) {
          case "goto":
            const dis = ((this.data.x-ani.value.x)**2+(this.data.y-ani.value.y)**2)**0.5;
            if (dis>dpf) {
              this.data.x = dpf/dis*ani.value.x+(1-dpf/dis)*this.data.x;
              this.data.y = dpf/dis*ani.value.y+(1-dpf/dis)*this.data.y;
              if (this.data.fill_region) this.data.fill_region.lineTo(this.data.x, this.data.y);
              this.data.move(this.data.x, this.data.y);
              ctx.stroke();
            } else {
              this.data.x = ani.value.x;
              this.data.y = ani.value.y;
              if (this.data.fill_region) this.data.fill_region.lineTo(this.data.x, this.data.y);
              this.data.move(this.data.x, this.data.y);
              ctx.stroke();
              this.data.cur_ani = null;
              this.data.ani_ptr += 1;
            }
            break;
          case "turn":
            if (ani.value.deg>degpf) {
              this.data.heading -= degpf;
              ani.value.deg -= degpf;
            } else if (ani.value.deg>-degpf) {
              this.data.heading -= ani.value.deg;
              this.data.cur_ani = null;
              this.data.ani_ptr += 1;
            } else {
              this.data.heading += degpf;
              ani.value.deg += degpf;
            }
            this.data.heading = (this.data.heading+360)%360;
            break;
          case "arc":
            const arc_len = Math.abs(ani.value.end-ani.value.start)/180*Math.PI*ani.value.r;
            if (arc_len>dpf) {
              var actual_deg = dpf/ani.value.r/Math.PI*180;
              if (ani.value.cc) actual_deg *= -1;
              var actual_end = ani.value.start + actual_deg;

              this.data.ctx.arc(
                ani.value.ox,
                ani.value.oy,
                ani.value.r,
                ani.value.start/180*Math.PI,
                actual_end/180*Math.PI,
                ani.value.cc
              );
              this.data.ctx.stroke();

              if (this.data.fill_region) {
                this.data.fill_region.arc(
                  ani.value.ox,
                  ani.value.oy,
                  ani.value.r,
                  ani.value.start/180*Math.PI,
                  actual_end/180*Math.PI,
                  ani.value.cc
                );
              };

              ani.value.start = actual_end;

              this.data.x = ani.value.ox+ani.value.r*Math.cos(actual_end/180*Math.PI);
              this.data.y = ani.value.oy+ani.value.r*Math.sin(actual_end/180*Math.PI);
              this.data.heading = (this.data.heading-actual_deg+360)%360;
            } else {
              this.data.ctx.arc(
                ani.value.ox,
                ani.value.oy,
                ani.value.r,
                ani.value.start/180*Math.PI,
                ani.value.end/180*Math.PI,
                ani.value.cc
              );
              this.data.ctx.stroke();

              if (this.data.fill_region) {
                this.data.fill_region.arc(
                  ani.value.ox,
                  ani.value.oy,
                  ani.value.r,
                  ani.value.start/180*Math.PI,
                  ani.value.end/180*Math.PI,
                  ani.value.cc
                );
              };
              
              this.data.x = ani.value.x;
              this.data.y = ani.value.y;
              this.data.heading = (-ani.value.d+360)%360;
              this.data.cur_ani = null;
              this.data.ani_ptr += 1;
            }
            break;
          case "dot":
            var size = ani.value.size;
            if (size==null) size = this.data.ctx.lineWidth+4;
            const dotpath = new Path2D();
            dotpath.arc(
              this.data.x,
              this.data.y,
              size/2, 0, 2*Math.PI
            );
            this.data.ctx.fill(dotpath);
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "up":
            this.data.move = this.data.ctx.moveTo.bind(this.data.ctx);
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "down":
            this.data.move = this.data.ctx.lineTo.bind(this.data.ctx);
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "pencolor":
            this.data.ctx.strokeStyle = ani.value.color;
            this.data.ctx.beginPath();
            this.data.ctx.moveTo(this.data.x, this.data.y);
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "fillcolor":
            this.data.ctx.fillStyle = ani.value.color;
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "beginfill":
            this.data.fill_region = new Path2D();
            this.data.fill_region.moveTo(this.data.x, this.data.y);
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "endfill":
            this.data.ctx.fill(this.data.fill_region);
            this.data.fill_region = null;
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "width":
            this.data.ctx.lineWidth = ani.value.width;
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "speed":
            this.data.speed = ani.value.speed;
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
            break;
          case "clear":
            this.data.ctx.beginPath();
            this.data.ctx.moveTo(this.data.x, this.data.y);
            this.data.ctx.clearRect(0, 0, this.properties.width, this.properties.height);
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
          case "showturtle":
            this.data.isvisible = true;
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
          case "hideturtle":
            this.data.isvisible = false;
            this.data.cur_ani = null;
            this.data.ani_ptr += 1;
          default:
            break;
        }
        if (this.data.speed!=0 || this.data.ani_ptr>=this.data.ani_queue.length) break;
      }
    },

    // turtle methods
    // turtle motion
    
    goto: function (x, y) {
      x += this.data.width/2;
      y = this.data.height/2-y;
      var d = 0;

      const last = this.data.ani_queue[this.data.ani_queue.length-1];
      if (last) {
        d = last.value.d;
      }

      this.data.ani_queue.push({
        type: "goto",
        value: {x, y, d}
      });
    },
    setpos: function (x, y) {this.goto(x,y);},
    setposition: function (x, y) {this.goto(x,y);},
    
    forward: function (dis) {
      var x = this.data.x-this.properties.width/2;
      var y = this.properties.height/2-this.data.y;
      var d = 0;

      const last = this.data.ani_queue[this.data.ani_queue.length-1];
      if (last) {
        x = last.value.x-this.data.width/2;
        y = this.data.height/2-last.value.y;
        d = last.value.d;
      }

      x += dis*Math.cos(d/180*Math.PI);
      y -= dis*Math.sin(d/180*Math.PI);
      
      this.goto(x, y);
    },
    fd: function (d) {this.forward(d)},
    
    backward: function (d) {this.forward(-d);},
    bk: function (d) {this.backward(d);},
    back: function (d) {this.backward(d);},
    
    left: function (deg) {
      deg = -deg;
      var x = this.data.width/2, y = this.data.height/2, d = deg;

      const last = this.data.ani_queue[this.data.ani_queue.length-1];
      if (last) {
        x = last.value.x;
        y = last.value.y;
        d = (last.value.d+deg+360)%360;
      }

      this.data.ani_queue.push({
        type: "turn",
        value: { x, y, d, deg }
      });
    },
    lt: function (d) {this.left(d);},

    right: function (d) {this.left(-d);},
    rt: function (d) {this.right(d);},


    // teleport: function (x, y) {
    // },

    setx: function (x) {
      var y = 0;
      const last = this.data.ani_queue[this.data.ani_queue.length-1];
      if (last) {
        y = this.data.height/2-last.value.y;
      }
      this.goto(x, y);
    },
    
    sety: function (y) {
      var x = 0;
      const last = this.data.ani_queue[this.data.ani_queue.length-1];
      if (last) {
        x = last.value.x-this.data.width/2;
      }
      this.goto(x, y);
    },

    setheading: function (d) {
      var value = this.quickValue();
      var deg = (d+value.d+540)%360-180;
      this.left(deg);
    },
    seth: function seth (d) {this.setheading(d);},

    home: function () {
      this.goto(0, 0)
      this.setheading(0);
    },

    speed: function (speed) {
      var value = this.quickValue();
      value.speed = speed
      this.data.ani_queue.push({
        type: "speed",
        value: value
      });
    },

    circle: function (r, deg=null) {
      if (!deg) deg = 360;
      var value = this.quickValue();
      value.ox = value.x+r*Math.sin(value.d/180*Math.PI);
      value.oy = value.y-r*Math.cos(value.d/180*Math.PI);

      if (r>=0) {
        value.cc = true;
        value.start = value.d+90;
        value.end = value.start-deg;
        value.r = r;
        value.d = (value.d-deg+360)%360;
      } else {
        value.cc = false;
        value.start = value.d-90;
        value.end = value.start+deg;
        value.r = -r;
        value.d = (value.d+deg+360)%360;
      }
      
      value.x = value.ox+r*Math.cos((value.d+90)/180*Math.PI);
      value.y = value.oy+r*Math.sin((value.d+90)/180*Math.PI);
      
      this.data.ani_queue.push({
        type: "arc",
        value: value
      });
    },

    dot: function (size=null) {
      var value = this.quickValue();
      value.size = size;
      this.data.ani_queue.push({
        type: "dot",
        value
      });
    },

    // pen control  
    pendown: function () {
      this.data.ani_queue.push({
        type: "down",
        value: this.quickValue()
      });
    },
    pd: function () {this.pendown();},
    down: function () {this.pendown();},
    
    penup: function () {
        this.data.ani_queue.push({
        type: "up",
        value: this.quickValue()
      });
    },
    pu: function () {this.penup();},
    up: function () {this.penup();},

    pensize: function (width) {
      var value = this.quickValue();
      value.width = width;
      this.data.ani_queue.push({
        type: "width",
        value
      });
    },
    width: function (w) {this.pensize(w);},

    pencolor: function (color) {
      var value = this.quickValue();
      value.color = color;
      this.data.ani_queue.push({
        type: "pencolor",
        value
      });
    },
    
    fillcolor: function (color) {
      var value = this.quickValue();
      value.color = color;
      this.data.ani_queue.push({
        type: "fillcolor",
        value
      });
    },

    color: function (color) {
      this.pencolor(color);
      this.fillcolor(color);
    },

    begin_fill: function () {
      this.data.ani_queue.push({
        type: "beginfill",
        value: this.quickValue()
      });
    },
    
    end_fill: function () {
      this.data.ani_queue.push({
        type: "endfill",
        value: this.quickValue()
      });
    },

    clear: function () {
      this.data.ani_queue.push({
        type: "clear", value: this.quickValue()
      });
    },

    showturtle: function () {
      this.data.ani_queue.push({
        type: "showturtle", value: this.quickValue()
      });
    },
    st: function () {this.showturtle();},

    hideturtle: function () {
      this.data.ani_queue.push({
        type: "hideturtle", value: this.quickValue()
      });
    },
    ht: function () {this.hideturtle();},

    xcor: function () {
      return this.quickValue().x-this.properties.width/2;
    },

    ycor: function () {
      return this.properties.height/2-this.quickValue().y;
    },

    // additional methods
    draw_image: function (image) {
      if (!image.src) return;
      const ctx = this.data.ctx;
      const img = this.data.canvas.createImage();
      const dx = image.x || 0;
      const dy = image.y || 0;
      const width = image.width;
      const height = image.height;
      const src = image.src;
      if (width && height) {
        img.onload = function () {
          ctx.drawImage(img, dx, dy, width, height);
        }
      } else {
        img.onload = function () {
          ctx.drawImage(img, dx, dy);
        }
      }
      img.src = src
    },

    debug: function () {
      for (var i=0; i<this.data.ani_queue.length; i+=1) {
        const q = this.data.ani_queue;
        switch (q[i].type) {
          case "arc":
            console.log(
              "[DEBUG INFO]",
              "type", q[i].type,
              "x", q[i].value.x,
              "y", q[q.length-1].value.y,
              "d", q[q.length-1].value.d,
              "ox", q[i].value.ox,
              "oy", q[i].value.oy,
              "r", q[i].value.r,
              "start", q[i].value.start,
              "end", q[i].value.end,
              "cc", q[i].value.cc,
            );
            break;
          default:
            console.log(
              "[DEBUG INFO]",
              "type", q[i].type,
              "x", q[i].value.x,
              "y", q[i].value.y,
              "d", q[i].value.d,
            );
        }
      }
    },

    // repl
    onReplInput: function (e) {
      this.data.repl_value= e.detail.value;
      var repl_style = "";
      repl_style += "min-width:" + String(this.properties.width-240) + "rpx;"
      this.setData({repl_style});
    },
    onReplSubmit: function (e) {
      const re = /^(\w+)\(([^)]*)\)(;?)$/;
      const float_re = /^[-+]?(\d+(\.\d+)?|\.\d+)$/
      const match = this.data.repl_value.match(re);
      
      var valid = false;
      if (match) {
        var cmd = match[1];
        var args = match[2].split(',');
        
        for (var i=0; i<args.length; i+=1) {
          args[i] = args[i].replace(/\s*/g, "");
        }
  
        switch (cmd) {
          case "goto":
          case "setposition":
          case "setpos":
            if (args.length!=2) break;
            if (!args[0].match(float_re)) break;
            if (!args[1].match(float_re)) break;
            args[0] = Number(args[0]);
            args[1] = Number(args[1]);
            this.goto(args[0], args[1]);
            valid = true;
            break;
          case "forward":
          case "fd":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.forward(args[0]);
            valid = true;
            break;
          case "backward":
          case "bk":
          case "back":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.backward(args[0]);
            valid = true;
            break;
          case "left":
          case "lt":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.left(args[0]);
            valid = true;
            break;
          case "right":
          case "rt":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.right(args[0]);
            valid = true;
            break;
          case "setx":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.setx(args[0]);
            valid = true;
            break;
          case "sety":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.sety(args[0]);
            valid = true;
            break;
          case "setheading":
          case "seth":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.setheading(args[0]);
            valid = true;
            break;
          case "home":
            if (args.length!=1 && args[0]!="") break;
            this.home();
            valid = true;
            break;
          case "speed":
            if (args.length!=1) break;
            if (!args[0].match(float_re)) break;
            args[0] = Number(args[0]);
            this.speed(args[0]);
            valid = true;
            break;
          case "circle":
            if (args.length==1) {
              if (!args[0].match(float_re)) break;
              args[0] = Number(args[0]);
              this.circle(args[0]);
              valid = true;
              break;
            } else if (args.length==2) {
              if (!args[0].match(float_re)) break;
              if (!args[1].match(float_re)) break;
              args[0] = Number(args[0]);
              args[1] = Number(args[1]);
              this.circle(args[0], args[1]);
              valid = true;
              break;
            }
          case "dot":
            if (args.length!=1) break;
            if (args[0]=="") {
              this.dot();
              valid = true;
              break;
            } else {
              if (!args[0].match(float_re)) break;
              args[0] = Number(args[0]);
              this.dot(args[0]);
              valid = true;
              break;
            }
          case "pendown":
          case "pd":
          case "down":
            if (args.length!=1 && args[0]!="") break;
            this.pendown();
            valid = true;
            break;
          case "penup":
          case "pu":
          case "up":
            if (args.length!=1 && args[0]!="") break;
            this.penup();
            valid = true;
            break;
          case "clear":
            if (args.length!=1 && args[0]!="") break;
            this.clear();
            valid = true;
            break;
          case "showturtle":
            if (args.length!=1 && args[0]!="") break;
            this.showturtle();
            valid = true;
            break;
          case "hideturtle":
            if (args.length!=1 && args[0]!="") break;
            this.hideturtle();
            valid = true;
            break;
          case "color":
            if (args.length!=1) break;
            this.color(args[0].slice(1, args[0].length-1));
            valid = true;
            break;
          case "width":
            if (args.length!=1) break;
            this.width(Number(args[0]));
            valid = true;
            break;
        }
      }

      var repl_style = "";
      repl_style += "min-width:" + String(this.properties.width-240) + "rpx;"
      if (!valid) {
        repl_style += "background-color: #fb7575;";
      } else {
        repl_style += "background-color: #75fb75;";
      }
      this.setData({repl_style});
    },
    onReplClear: function (e) {
      var repl_style = "";
      repl_style += "min-width:" + String(this.properties.width-240) + "rpx;"
      this.setData({repl_style, repl_value: ""});
    }
  }
})