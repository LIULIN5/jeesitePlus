
var onlineAdress="";	//在线管理地址
var wimadress="";		//即时聊天地址
var user = "FH";		//用于即时通讯（ 当前登录用户）
var uname = "";			//姓名
var fhsmsSound = '1';	//站内信提示音效
var fwebsocket = null;

var startMusic = true;
var SKIN = '../../../assets/windows/images/bg_01.jpg';

var vm = new Vue({
    el: '#app',

    data:{
    	sysName:'FH Admin',	//系统名称
    	systemset:false,	//隐藏系统设置
    	userPhoto:'../../../assets/images/user/avatar-2.jpg',	//用户头像
    	user_name:'',		//用户姓名
    	fhsmsCount:0,		//站内信总数
    	hdcontent: ''		//审批详情
    },
    
    methods: {
        
        index: function(){
        	$.ajax({
        		xhrFields: {
                    withCredentials: true
                },
        		type: "POST",
        		url: httpurl+'main/index',
        		data: {tm:new Date().getTime()},
        		dataType:"json",
        		async: false,
        		success: function(data){
        		 if("success" == data.result){
        			startMusic = data.startMusic == 'true'?true:false;
        			SKIN = '../../../'+data.SKIN;				//背景
        		 }else if ("exception" == data.result){
                 	alert("初始程序异常,稍后再试"+data.exception);
                 }else{
                	alert("登录失效!请求服务器无响应,稍后再试");
             		$.ajax({
                 		xhrFields: {
                             withCredentials: true
                         },
                 		type: "POST",
                 		url: httpurl+'main/logout',
                 		data: {tm:new Date().getTime()},
                 		dataType:"json",
                 		success: function(data){
                 			window.location.href="../../login.html";
                 		}
                 	}).done().fail(function(){
                 		window.location.href="../../login.html";
                     });
        		 }
        		}
        	}).done().fail(function(){
        		alert("登录失效!请求服务器无响应,稍后再试");
        		$.ajax({
            		xhrFields: {
                        withCredentials: true
                    },
            		type: "POST",
            		url: httpurl+'main/logout',
            		data: {tm:new Date().getTime()},
            		dataType:"json",
            		success: function(data){
            			window.location.href="../../login.html";
            		}
            	}).done().fail(function(){
            		window.location.href="../../login.html";
                });
            });
        },
        
        getInfo: function(){
        	$.ajax({
        		xhrFields: {
                    withCredentials: true
                },
        		type: "POST",
        		url: httpurl+'head/getInfo',
        		data: {tm:new Date().getTime()},
        		dataType:"json",
        		success: function(data){
        		 if("success" == data.result){
        			 if('admin' == data.USERNAME)vm.systemset = true;	//非admin隐藏系统设置
        			 vm.updateUserPhoto(httpurl+data.userPhoto);		//用户头像
        			 vm.user_name = data.NAME;							//用户姓名
        			 vm.sysName= data.sysName							//系统名称
        			 onlineAdress = data.onlineAdress;					//在线管理地址
        			 wimadress= data.wimadress;							//即时聊天地址
        			 user = data.USERNAME;								//用户名
        			 uname = data.NAME;									//用户姓名
        			 vm.online();										//加入在线列表
        			 vm.topTask();										//刷新待办任务
        			 vm.fhsmsCount = Number(data.fhsmsCount);
        			 if(vm.fhsmsCount > 0){
        				 setTimeout(function () {
                          	vm.showNoreadNews();
                          }, 2000);
        			 }
        			 
        			 fhsmsSound = data.fhsmsSound;						//站内信提示音效
        		 }else if ("exception" == data.result){
                 	layer.msg("获取基础信息程序异常,稍后再试." + data.exception);//显示异常
                 }
        		}
        	});
        },
        
        //刷新用户头像
        updateUserPhoto: function(value){
        	this.userPhoto = value;
        },
        
        //显示未读消息
        showNoreadNews: function(){
        	$("#fhsmsCount").tips({
        		side:1,
                msg:'您有 '+this.fhsmsCount+' 条未读消息',
                bg:'#AE81FF',
                time:10
            });
        },
        
        //去通知收信人有站内信接收
        fhsmsmsg: function(USERNAME){
        	var arrUSERNAME = USERNAME.split(';');
        	for(var i=0;i<arrUSERNAME.length;i++){
        		fwebsocket.send('[fhsms]'+arrUSERNAME[i]);//发送站内信通知
        	}
        },

        //读取站内信时减少未读总数
        readFhsms: function(){
        	this.fhsmsCount = Number(this.fhsmsCount)-1;
        	this.fhsmsCount = Number(this.fhsmsCount) <= 0 ?'0':this.fhsmsCount;
        	 if(Number(this.fhsmsCount) > 0){
        			$("#fhsmsCount").tips({
        				side:1,
        				msg:'您还有 '+this.fhsmsCount+' 条未读消息',
        		        bg:'#AE81FF',
        		        time:10
        		    });
        		 }
        },

        //获取站内信未读总数(在站内信删除未读新信件时调用此函数更新未读数)
        getFhsmsCount: function(){
        	$.ajax({
        		xhrFields: {
                    withCredentials: true
                },
        		type: "POST",
        		url: httpurl+'fhsms/getFhsmsCount?tm='+new Date().getTime(),
            	data: encodeURI(""),
        		dataType:'json',
        		success: function(data){
        			if("exception" == data.result){
                    	layer.msg("站内信程序异常,稍后再试." + data.exception);//显示异常
                    }else{
                    	vm.fhsmsCount = Number(data.fhsmsCount);
           			 	if(this.fhsmsCount > 0){
           			 		$("#fhsmsCount").tips({
           					side:1,
           					msg:'您还有 '+vm.fhsmsCount+' 条未读消息',
           			        bg:'#AE81FF',
           			        time:10
           			 		});
           			 	}
                    }
        		}
        	});
        },
        
        //加入在线列表
        online: function(){
        	if (window.WebSocket) {
        		fwebsocket = new WebSocket(encodeURI('ws://'+onlineAdress)); //oladress在main.jsp页面定义
        		fwebsocket.onopen = function() {
        			fwebsocket.send('[join]'+user); //连接成功
        		};
        		fwebsocket.onerror = function() {
        			//连接失败
        		};
        		fwebsocket.onclose = function() {
        			//连接断开
        		};
        		//消息接收
        		fwebsocket.onmessage = function(message) {
        			var message = JSON.parse(message.data);
        			if(message.type == 'goOut'){
        				$("body").html("");
        				vm.goOut("1");
        			}else if(message.type == 'thegoout'){
        				$("body").html("");
        				vm.goOut("2");
        			}else if(message.type == 'senFhsms'){
        				vm.fhsmsCount = Number(vm.fhsmsCount)+1;
        				if('0' != fhsmsSound){
        					$("#fhsmsobj").html('<audio style="display: none;" id="fhsmstsy" src="../../../assets/sound/'+fhsmsSound+'.mp3" autoplay controls></audio>');
        				}
        				$("#fhsmsCount").tips({
        					side:1,
        			        msg:'收到1条新消息,您还有 '+vm.fhsmsCount+' 条未读消息',
        			        bg:'#AE81FF',
        			        time:10
        			    });
        			}else if(message.type == 'fhtask'){
        				if(message.RNUMBER == 'no'){
        					$("#fhsmsobj").html('<audio style="display: none;" id="fhsmstsy" src="../../../assets/sound/'+fhsmsSound+'.mp3" autoplay controls></audio>');
        					vm.topTask();//刷新待办任务列表
        				}else{
        					$.ajax({
        						xhrFields: {
        		                    withCredentials: true
        		                },
        						type: "POST",
        						url: httpurl+'/head/isNowRole',
        				    	data: {RNUMBER:message.RNUMBER,tm:new Date().getTime()},
        						dataType:'json',
        						success: function(data){
        							 if('yes' == data.msg){
        								$("#fhsmsobj").html('<audio style="display: none;" id="fhsmstsy" src="../../../assets/sound/'+fhsmsSound+'.mp3" autoplay controls></audio>');
        								vm.topTask();//刷新顶部待办任务列表
        							 }else if ("exception" == data.result){
        					            layer.msg("待办任务程序异常,稍后再试." + data.exception);//显示异常
        					         }
        						}
        					});
        				}
        			}
        		};
        	}
        },
        
        //待办任务
        topTask: function(){
        	$.ajax({
        		xhrFields: {
                    withCredentials: true
                },
        		type: "POST",
        		url: httpurl+'/rutask/getList?tm='+new Date().getTime(), //待办任务
            	data: encodeURI(""),
        		dataType:'json',
        		success: function(data){
        			 var taskCount = Number(data.taskCount);
        			 if(taskCount > 0)$("#taskCount").html(Number(taskCount));				//待办任务总数
        			 if(taskCount == 0){
        				 $("#taskCount").html('');
        				 $("#myTask").html('<div class="winui-message-item"><h2>没有需要办理的任务</h2><div class="content"></div></div>');
        			 }
        			 $("#myTask").html('<li></li>');
        			 $.each(data.list, function(i, list){
        				 $("#myTask").append('<div class="winui-message-item"><h2>'+(i+1)+'.'+list.PNAME_+'</h2><div class="content">'+list.NAME_+'</div></div>');
        			 });
        			 if(taskCount > 0){
        				 $("#taskCount").tips({
        						side:1,
        			            msg:'您有任务需要办理',
        			            bg:'#AE81FF',
        			            time:30
        			     });
        			 }
        			 if ("exception" == data.result){
				          layer.msg("待办任务程序异常,稍后再试." + data.exception);//显示异常
				      }
        		}
        	});
        },
        
        //下线
        goOut: function(msg){
        	$.ajax({
        		xhrFields: {
                    withCredentials: true
                },
        		type: "POST",
        		url: httpurl+'main/logout',
        		data: {tm:new Date().getTime()},
        		dataType:"json",
        		success: function(data){
        			window.location.href="../../login.html?msg="+msg;
        		}
        	}).done().fail(function(){
        		window.location.href="../../login.html?msg="+msg;
            });
        },

        //去通知任务待办人有新任务
        fhtaskmsg: function(USERNAME){
        	this.topTask();//刷新待办任务列表
        	fwebsocket.send('[fhtask]'+USERNAME);//发送新任务通知
        },
        
        //修改头像
        editPhoto: function (){
        	 var diag = new top.Dialog();
        	 diag.Drag=true;
        	 diag.Title ="修改头像";
        	 diag.URL = '../photo/editPhoto.html';
        	 diag.Width = 669;
        	 diag.Height = 525;
        	 diag.Modal = true;				//有无遮罩窗口
        	 diag.CancelEvent = function(){ //关闭事件
        		diag.close();
        	 };
        	 diag.show();
        },

        //系统设置
        sysSet: function (){
        	 var diag = new top.Dialog();
        	 diag.Drag=true;
        	 diag.Title ="系统设置";
        	 diag.URL = '../index/sysSet.html';
        	 diag.Width = 650;
        	 diag.Height = 525;
        	 diag.Modal = true;				//有无遮罩窗口
        	 diag. ShowMaxButton = true;	//最大化按钮
        	 diag.ShowMinButton = true;		//最小化按钮 
        	 diag.CancelEvent = function(){ //关闭事件
        		diag.close();
        	 };
        	 diag.show();
        },
        
        //站内信
        fhsms: function (){
        	 var diag = new top.Dialog();
        	 diag.Drag=true;
        	 diag.Title ="站内信";
        	 diag.URL = '../fhsms/fhsms_list.html';
        	 diag.Width = 900;
        	 diag.Height = 600;
        	 diag. ShowMaxButton = true;	//最大化按钮
             diag.ShowMinButton = true;		//最小化按钮 
        	 diag.CancelEvent = function(){ //关闭事件
        		diag.close();
        	 };
        	 diag.show();
        },
        
        //打开我的待办任务列表
        rutasklist: function (){
        	 var diag = new top.Dialog();
        	 diag.Drag=true;
        	 diag.Title ="我的待办任务";
        	 diag.URL = '../../act/rutask/rutask_list.html';
        	 diag.Width = 1100;
        	 diag.Height = 600;
        	 diag.Modal = true;				//有无遮罩窗口
        	 diag. ShowMaxButton = true;	//最大化按钮
        	 diag.ShowMinButton = true;		//最小化按钮
        	 diag.CancelEvent = function(){ //关闭事件
        		diag.close();
        	 };
        	 diag.show();
        },
        
        //用于子窗口获取父页面中的参数(应用于流程信息审批详情内容)
        handleDetails: function (value){
        	if(value != ''){
        		this.hdcontent = value;
        	}else{
        		return this.hdcontent;
        	}
        },

        //初始执行
        init() {
            this.index();
            this.getInfo();					//基础资料
            document.getElementsByTagName("title")[0].innerText = this.sysName;
        }
    },

    mounted(){
        this.init()
    }

})

//保存用户皮肤风格
function saveSkin(value){
	$.ajax({
		xhrFields: {
            withCredentials: true
        },
		type: "POST",
		url: httpurl+'head/saveSkin',
		data: {SKIN:value,tm:new Date().getTime()},
		dataType:'json',
		success: function(data){
			if ("success" == data.result) {
			}
		}
	});
}

//修改个人资料
function goEditMyInfo(){
	 var diag = new top.Dialog();
	 diag.Drag=true;
	 diag.Title ="个人资料";
	 diag.URL = '../user/user_edit.html?fx=head';
	 diag.Width = 600;
	 diag.Height = 339;
	 diag.Modal = true;				//有无遮罩窗口
	 diag. ShowMaxButton = true;	//最大化按钮
	 diag.ShowMinButton = true;		//最小化按钮 
	 diag.CancelEvent = function(){ //关闭事件
		diag.close();
	 };
	 diag.show();
}

//计算器
function calculator (){
  	 var diag = new top.Dialog();
  	 diag.Drag=true;
  	 diag.Title ="计算器";
  	 diag.URL = '../../tools/calculator/view.html';
  	 diag.Width = 179;
  	 diag.Height = 216;
  	 diag.Modal = false;			//有无遮罩窗口
  	 diag.CancelEvent = function(){ //关闭事件
  		diag.close();
  	 };
  	 diag.show();
  }
