db = false;
baseUrl = "";
isGuest = 0;
serverMaxId = 0;
studyMaxId = 0;
loadedAudioFiles = 0;
totalAudioFiles = 0;
servers = {};
studies = {};
tables = ["study", "question", "questionOption", "expression", "answer", "alters", "interview", "alterList", "alterPrompt", "notes", "graphs"];
questions = {};
ego_id_questions = {};
questionTitles = {};
egoIdQs = [];
egoAnswers = [];
egoOptions = [];
interviews = [];

var checkPlugin = setInterval(function(){ loadPlugin() }, 100);

function loadPlugin() {
    if(typeof window.cordova != "undefined"){
        if(sqlitePlugin != "undefined"){
            db = sqlitePlugin.openDatabase({name: 'egoweb.db', location:"default"});
            clearInterval(checkPlugin);
            loadDb();
        }else{
            console.log("plugin still needs to load");
        }
    }else{
        db = openDatabase('egoweb', '1.0', 'egoweb database', 5 * 1024 * 1024);
        clearInterval(checkPlugin);
        loadDb();
    }
}

function loadDb() {
    db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE IF NOT EXISTS server (ID INTEGER PRIMARY KEY, ADDRESS);', [], function(tx, res) {
            console.log("server database created");
            txn.executeSql('SELECT * FROM server', [], function(tx, res) {
                if(res.rows.length == 0 )
                   serverMaxId = 0;
                for(i = 0; i < res.rows.length; i++){
                    if(res.rows.item(i).ID > serverMaxId)
                        serverMaxId = res.rows.item(i).ID;
                    servers[res.rows.item(i).ID] = res.rows.item(i).ADDRESS;
                }
                console.log("server list loaded:");
                console.log(servers);
            });
        });
    });
        db.transaction(function (txn) {
            txn.executeSql('SELECT * FROM study', [], function(tx, res) {
                for(i = 0; i < res.rows.length; i++){
                    studies[res.rows.item(i).ID] = res.rows.item(i);
                }
                console.log("Study list loaded:");
                console.log(studies);
            });
            txn.executeSql("SELECT * FROM question WHERE subjectType = 'EGO_ID' ORDER BY ORDERING",  [], function(tx,res){
                for(i = 0; i < res.rows.length; i++){
                    if(typeof egoIdQs[res.rows.item(i).STUDYID] == "undefined")
                        egoIdQs[res.rows.item(i).STUDYID] = []
                    egoIdQs[res.rows.item(i).STUDYID].push(res.rows.item(i));
                }
            });
            txn.executeSql("SELECT QUESTIONID, INTERVIEWID, VALUE FROM answer WHERE questionType = 'EGO_ID'",  [], function(tx,res){
                for(i = 0; i < res.rows.length; i++){
                    if(typeof egoAnswers[res.rows.item(i).INTERVIEWID] == "undefined")
                        egoAnswers[res.rows.item(i).INTERVIEWID] = [];
                    egoAnswers[res.rows.item(i).INTERVIEWID][res.rows.item(i).QUESTIONID] = res.rows.item(i).VALUE;
                }
            });
            txn.executeSql("SELECT ID, NAME FROM questionOption",  [], function(tx,res){
                for(i = 0; i < res.rows.length; i++){
                    egoOptions[res.rows.item(i).ID] = res.rows.item(i).NAME;
                }
            });
            txn.executeSql('SELECT * FROM interview',  [], function(tx,res){
                for(i = 0; i < res.rows.length; i++){
                    if(typeof interviews[res.rows.item(i).STUDYID] == "undefined")
                        interviews[res.rows.item(i).STUDYID] = [];
                    interviews[res.rows.item(i).STUDYID].push(res.rows.item(i));
                }
            });
        }, null, function(txn){
            for(k in studies){
                for(i = 0; i < interviews[studies[k].ID].length; i++){
                    interviews[studies[k].ID][i].egoValue = "";
                    for(j in egoIdQs[interviews[studies[k].ID][i].STUDYID]){
                        if(interviews[studies[k].ID][i].egoValue)
                            interviews[studies[k].ID][i].egoValue = interviews[studies[k].ID][i].egoValue + "_";
                        if(egoIdQs[interviews[studies[k].ID][i].STUDYID][j].ANSWERTYPE == "MULTIPLE_SELECTION")
                            interviews[studies[k].ID][i].egoValue = interviews[studies[k].ID][i].egoValue + egoOptions[egoAnswers[interviews[studies[k].ID][i].ID][egoIdQs[interviews[studies[k].ID][i].STUDYID][j].ID]];
                        else
                            interviews[studies[k].ID][i].egoValue = interviews[studies[k].ID][i].egoValue + egoAnswers[interviews[studies[k].ID][i].ID][egoIdQs[interviews[studies[k].ID][i].STUDYID][j].ID];
                    }
                }
            }
        });
}

app.config(function($routeProvider) {
    $routeProvider

    .when('/', {
        templateUrl: baseUrl + 'main.html',
        controller: 'mainController'
    })


    .when('/admin', {
        templateUrl: baseUrl + 'admin.html',
        controller: 'adminController'
    })

    .when('/studies', {
        templateUrl: baseUrl + 'studies.html',
        controller: 'studiesController'
    })

});

app.factory("getStudies", function($http, $q) {
    var result = function(id) {
        var url = servers[id] + '/mobile/getstudies';
        if (!url.match('http') && !url.match('https')) url = "http://" + url;
        return $.ajax({
            url: url,
            type: 'POST',
            data: $("#serverForm_" + id).serialize(),
            crossDomain: true,
            success: function(data) {
                if (data != "error" && data != "failed") {
                    return data;
                    $('#addServerButton').show();
                } else {
                    displayAlert("Validation failed", "alert-danger");
                    return data;
                }
            },
            error: function(data) {
                displayAlert(data, "alert-danger");
            }
        });
    }
    return {
        result: result
    }
});

app.factory("getServer", function($http, $q) {
    console.log("getServer");
    var result = function(address) {
        var url = address + '/mobile/check';
        if (!url.match('http') && !url.match('https'))
            url = "http://" + url;
        return $.ajax({
            url: url,
            type: 'GET',
            crossDomain: true,
            success: function(data) {
                if (data == "success") {
                    displayAlert('Connected to server', "alert-success");
                } else {
                    displayAlert('Mo response from server', "alert-danger");
                }
            },
            error: function(data) {
                displayAlert("Can't connect to server", "alert-danger");
            }
        });
    }
    return {
        result: result
    }
});

app.factory("importStudy", function($http, $q) {
    console.log("importStudy starting");
    var result = function(address, studyId) {
        displayAlert("Importing study...", "alert-warning")
        var url = address + '/mobile/ajaxdata/' + studyId;
        if (!url.match('http') && !url.match('https'))
            url = "http://" + url;
        return $.ajax({
            url: url,
            type: "GET",
            timeout: 30000,
            crossDomain: true,
            success: function(data) {
                data = JSON.parse(data);
                return data;
            }
        });
    }
    return {
        result: result
    }
});

app.factory("saveAlter", function($http, $q) {
    var getAlters = function(){
    var defer = $.Deferred();
    var name = $("#Alters_name").val();

    if(typeof study.MULTISESSIONEGOID != "undefined" && parseInt(study.MULTISESSIONEGOID) != 0){
        var interviewIds = getInterviewIds(interviewId);
        for(k in alters){
            if(alters[k].NAME == name){
                var oldAlter = alters[k];
                alters[k].INTERVIEWID = alters[k].INTERVIEWID + "," + interviewId
            }
        }
    }
    if(typeof oldAlter != "undefined" && oldAlter){
        newAlter = {INTERVIEWID: interviewId, ID: oldAlter.ID};
        var alterSQL = "UPDATE alters SET INTERVIEWID = ? WHERE id = ?";
    }else{
        newAlter = {
            ID: null,
            ACTIVE:1,
            ORDERING: Object.keys(alters).length,
            NAME: name,
            INTERVIEWID: interviewId,
            ALTERLISTID: '',
            NAMEGENQIDS: $("#Alters_nameGenQIds").val()
        };
        console.log(newAlter);
        var alterSQL = 'INSERT INTO alters VALUES (' +  Array(objToArray(newAlter).length).fill("?").join(",") + ')';
    }
    db.transaction(function (txn) {
        txn.executeSql(alterSQL, objToArray(newAlter), function(tx, res){
            console.log("made new alter");
            if(typeof oldAlter == "undefined"){
                newAlter.ID = res.insertId;
                alters[newAlter.ID] = newAlter;
                console.log(alters);
            }
        });
    },
    function(txn){
        console.log(txn);
    },
    function(txn){
        console.log("alter saved");
        defer.resolve(JSON.stringify(alters));
    });
    return defer.promise();
    }
    return {
        getAlters: getAlters
    }
});

app.factory("deleteAlter", function($http, $q) {
    var getAlters = function() {
        var defer = $.Deferred();
        var id = $("#deleteAlterId").val();
    	if(typeof study.MULTISESSIONEGOID != "undefined" && parseInt(study.MULTISESSIONEGOID) != 0){
    		var interviewIds = alters[id].INTERVIEWID.toString().split(",");
    		$(interviewIds).each(function(index){
    			if(interviewIds[index] == interviewId)
    				interviewIds.splice(index,1);
    		});
    		alters[id].INTERVIEWID = interviewIds.join(",");
    		alterSQL = "UPDATE alters SET INTERVIEWID = ? WHERE ID = ?";
            deleteAlter = [interviewId, id];
    	}else{
        	delete alters[id];
            alterSQL = "DELETE FROM alters WHERE ID = ?";
            deleteAlter = [id];
    	}
        db.transaction(function (txn) {
            txn.executeSql(alterSQL, deleteAlter, function(tx, res){
                console.log("deleted alter");
            });
        },
        function(txn){
            console.log(txn);
        },
        function(txn){
        	return defer.resolve(JSON.stringify(alters));
        });
        return defer.promise();
    }
    return {
        getAlters : getAlters
    }
});

app.controller('mainController', ['$scope', '$log', '$routeParams', '$sce', '$location', '$route', function($scope, $log, $routeParams, $sce, $location, $route) {
    studyList = {};
    $("#questionMenu").addClass("hidden");
    $("#studyTitle").html("");
    $("#questionTitle").html("");
}]);

app.controller('studiesController', ['$scope', '$log', '$routeParams', '$sce', '$location', '$route', function($scope, $log, $routeParams, $sce, $location, $route) {
    $("#questionMenu").addClass("hidden");
    $("#studyTitle").html("Studies");
    $("#questionTitle").html("");
    $scope.studies = studies;
    $scope.interviews = interviews;
    $scope.done = [];
    for(k in studies){
        if(typeof $scope.done[studies[k].ID] == "undefined")
            $scope.done[studies[k].ID] = [];
        for(j in interviews[studies[k].ID]){
            interviews[studies[k].ID][j].egoValue = "";
            for(l in egoIdQs[interviews[studies[k].ID][j].STUDYID]){
                if(interviews[studies[k].ID][j].egoValue)
                    interviews[studies[k].ID][j].egoValue = interviews[studies[k].ID][j].egoValue + "_";
                if(egoIdQs[interviews[studies[k].ID][j].STUDYID][l].ANSWERTYPE == "MULTIPLE_SELECTION")
                    interviews[studies[k].ID][j].egoValue = interviews[studies[k].ID][j].egoValue + egoOptions[egoAnswers[interviews[studies[k].ID][j].ID][egoIdQs[interviews[studies[k].ID][j].STUDYID][l].ID]];
                else
                    interviews[studies[k].ID][j].egoValue = interviews[studies[k].ID][j].egoValue + egoAnswers[interviews[studies[k].ID][j].ID][egoIdQs[interviews[studies[k].ID][j].STUDYID][l].ID];
            }
            if(interviews[studies[k].ID][j].COMPLETED == -1)
                $scope.done[studies[k].ID].push(interviews[studies[k].ID][j].ID);
        }
    }
    justUploaded = [];
    $scope.startSurvey = function(studyId, intId) {
	    study = studies[studyId];
        multiIds = [studyId];
        studyNames = [];
        questionList = [];
        for(k in studies){
            if($.inArray(studies[k].ID, multiIds) != -1)
                studyNames[studies[k].ID] = studies[k].NAME;
        }
        db.readTransaction(function (txn) {
            txn.executeSql('SELECT * FROM question WHERE studyId = ' + studyId + " ORDER BY ORDERING",  [], function(tx,res){
                console.log(res.rows);
                for(i = 0; i < res.rows.length; i++){
                    if(res.rows.item(i).SUBJECTTYPE == "EGO_ID")
                        ego_id_questions[parseInt(res.rows.item(i).ID)] = res.rows.item(i);
                    questions[parseInt(res.rows.item(i).ID)] = res.rows.item(i);
                    questionList.push(res.rows.item(i));
                    if(typeof questionTitles[studyNames[res.rows.item(i).STUDYID]] == "undefined")
                        questionTitles[studyNames[res.rows.item(i).STUDYID]] = {};
                    questionTitles[studyNames[res.rows.item(i).STUDYID]][res.rows.item(i).TITLE] = res.rows.item(i).ID;
                };
                console.log("questions loaded...");
            }, function(tx, error){
                console.log(tx);
                console.log(error);
            });
            txn.executeSql('SELECT * FROM questionOption WHERE studyId = ' + studyId + " ORDER BY ORDERING", [], function(tx,res){
                options = [];
                for(i = 0; i < res.rows.length; i++){
                	if(typeof options[res.rows.item(i).QUESTIONID] == "undefined")
                    	options[res.rows.item(i).QUESTIONID] = [];
                	options[res.rows.item(i).QUESTIONID][res.rows.item(i).ORDERING] = res.rows.item(i);
            	}
                console.log("options loaded...");
            }, function(tx, error){
                console.log(tx);
                console.log(error);
            });
            txn.executeSql('SELECT * FROM expression WHERE studyId = ' + studyId, [], function(tx,res){
                expressions = [];
                for(i = 0; i < res.rows.length; i++){
                    expressions[res.rows.item(i).ID] = res.rows.item(i);
            	}
                console.log("expressions loaded...");
            }, function(tx, error){
                console.log(tx);
                console.log(error);
            });
        },
        function(txn){
            console.log(txn);
        },
        function(txn){
            console.log("study loaded...");
            csrf = "";
            answers = {};
            audio = [];
    		alters = {};
            prevAlters = {};
            graphs = {};
            allNotes = {};
            otherGraphs = {};
            alterPrompts = [];
            participantList = [];
        	participantList['email'] = [];
        	participantList['name'] = [];
        	if(typeof intId == "undefined"){
            	interviewId = undefined;
            	interview = false;
                var page = 0;
                var url = $location.absUrl().replace($location.url(),'');
                $("#studyTitle").html(study.NAME);
                document.location = url + "/page/" + parseInt(page);
        	}else{
        		interviewId = intId;
                db.readTransaction(function (txn) {
                    txn.executeSql("SELECT * FROM interview WHERE id = " + interviewId,  [], function(tx,res){
                        interview = res.rows.item(0);
                        page = interview.COMPLETED;
                        if(page == -1)
                            page = 0;
                    });
                    txn.executeSql("SELECT * FROM graphs WHERE interviewId = " + interviewId,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            graphs[res.rows.item(i).EXPRESSIONID] = res.rows.item(i);
                        }
                    });
                    txn.executeSql("SELECT * FROM notes WHERE interviewId = " + interviewId,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            if(typeof allNotes[res.rows.item(i).EXPRESSIONID] == "undefined")
                                allNotes[res.rows.item(i).EXPRESSIONID] = {};
                            allNotes[res.rows.item(i).EXPRESSIONID][res.rows.item(i).ALTERID] = res.rows.item(i);
                        }
                    });
                	if(typeof study.MULTISESSIONEGOID != "undefined" && parseInt(study.MULTISESSIONEGOID) != 0){
                		var interviewIds = getInterviewIds(interviewId);
                		interviewIds.splice(interviewIds.indexOf(interviewId),1);
                		for(var k in interviewIds){
                			prevAlters = db.queryObjects("SELECT * FROM alters WHERE CONCAT(',', interviewId, ',') LIKE '%," + interviewIds[k] + ",%' AND CONCAT(',', interviewId, ',') NOT LIKE '%," + interviewId + ",%'").data;
                		}
                	}
                    txn.executeSql("SELECT * FROM alters WHERE interviewId = ? OR interviewId LIKE ? OR interviewId LIKE ? OR interviewId LIKE ?",  [interviewId, "%," + interviewId, interviewId + ",%", ",%" + interviewId + ",%"], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            alters[res.rows.item(i).ID] = res.rows.item(i);
                        }
                    });
            		if(typeof study.MULTISESSIONEGOID != "undefined" && parseInt(study.MULTISESSIONEGOID) != 0){
            			var interviewIds = getInterviewIds(interviewId);
            			var aSQL = "SELECT * FROM answer WHERE interviewId in (" + interviewIds.join(",") + ")";
            		}else{
            			var aSQL = "SELECT * FROM answer WHERE interviewId = " + interviewId;
            		}
                    txn.executeSql(aSQL,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            if(res.rows.item(i).QUESTIONTYPE == "ALTER")
                				array_id = res.rows.item(i).QUESTIONID + "-" + res.rows.item(i).ALTERID1;
                			else if(res.rows.item(i).QUESTIONTYPE == "ALTER_PAIR")
                				array_id = res.rows.item(i).QUESTIONID + "-" + res.rows.item(i).ALTERID1 + "and" + res.rows.item(i).ALTERID2;
                			else
                				array_id = res.rows.item(i).QUESTIONID;
                			answers[array_id] = res.rows.item(i);
                        }
                    });
                    txn.executeSql("SELECT * FROM alterList WHERE studyId = " + study.ID,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            if(res.rows.item(i).EMAIL)
                                participantList['email'].push(res.rows.item(i).EMAIL);
                            if(res.rows.item(i).NAME)
                                participantList['name'].push(res.rows.item(i).NAME);
                        }
                    });
                    txn.executeSql("SELECT * FROM alterPrompt WHERE studyId = " + study.ID,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            alterPrompts[res.rows.item(i).AFTERALTERSENTERED] = res.rows.item(i).DISPLAY;
                        }
                    });
                }, function(txn){console.log(txn)}, function(txn){
                    console.log("load interview copmlete...")
                    var url = $location.absUrl().replace($location.url(),'');
                    $("#studyTitle").html(study.NAME);
                    document.location = url + "/page/" + parseInt(page);
                });
        	}
        });
        //db.queryRowObject("SELECT * FROM study WHERE id = " + studyId);
        //if(typeof study.MULTISESSIONEGOID != "undefined" && parseInt(study.MULTISESSIONEGOID) != 0){
        //    var qTitle = db.queryValue("SELECT title FROM question WHERE ID = " + study.MULTISESSIONEGOID);
        //	var column = db.queryObjects("SELECT STUDYID FROM question WHERE title = '" + qTitle + "'").data;
        //	var multiIds = [];
        //	for (var k in column){
        //		multiIds.push(column[k].STUDYID)
        //	}
    	//}else{
    	//}
        /*
    	ego_id_questions = db.queryObjects("SELECT * FROM question WHERE subjectType = 'EGO_ID' AND studyId = " + studyId + " ORDER BY ORDERING").data;
    	ego_questions = db.queryObjects("SELECT * FROM question WHERE subjectType = 'EGO' AND studyId = " + studyId + " ORDER BY ORDERING").data;
    	alter_questions = db.queryObjects("SELECT * FROM question WHERE subjectType = 'ALTER' AND studyId = " + studyId + " ORDER BY ORDERING").data;
    	alter_pair_questions = db.queryObjects("SELECT * FROM question WHERE subjectType = 'ALTER_PAIR' AND studyId = " + studyId + " ORDER BY ORDERING").data;
    	network_questions = db.queryObjects("SELECT * FROM question WHERE subjectType = 'NETWORK' AND studyId = " + studyId + " ORDER BY ORDERING").data;
        */
    }
    $scope.deleteInterview = function(intId) {
        console.log("Deleting interview: " + intId);
        deleteInterview(intId);
        $route.reload();
    }
    $scope.upload = function(studyId){
        displayAlert('Uploading inerviews...', "alert-warning");
    	$("#uploader-" + studyId).prop('disabled', true);
    	var serverAddress = servers[studies[studyId].SERVER];
        var serverId = studies[studyId].SERVER;
    	var url = serverAddress + "/mobile/uploadData";
        if (!url.match('http') && !url.match('https'))
            url = "http://" + url;
        db.readTransaction(function (txn) {
            data = new Object;
            data['study'] = $.extend(true,{}, studies[studyId]);
            data['study'].ID = data['study'].SERVERSTUDYID;
            data['alters'] = [];
            data['answers'] = [];
            data['questions'] = [];
            data['questionOptions'] = [];
            data['expressions'] = [];
            data['interviews'] = [];
            for(k in interviews[studyId]){
                if(interviews[studyId][k].COMPLETED == -1){
                    txn.executeSql("SELECT * FROM alters WHERE interviewId = " + interviews[studyId][k].ID,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            data['alters'].push(res.rows.item(i));
                        }
                    });
                    txn.executeSql("SELECT * FROM answer WHERE interviewId = " + interviews[studyId][k].ID,  [], function(tx,res){
                        for(i = 0; i < res.rows.length; i++){
                            var answer = res.rows.item(i);
                            answer.STUDYID = data['study'].ID;
                            data['answers'].push(answer);
                        }
                    });
                    var interview = $.extend(true,{}, interviews[studyId][k]);
                    interview.STUDYID = data['study'].ID;
                    interview.ACTIVE = 2;
                    data['interviews'].push(interview);
                }
            }
            txn.executeSql('SELECT * FROM question WHERE studyId = ' + studyId + " ORDER BY ORDERING",  [], function(tx,res){
                console.log(res.rows);
                for(i = 0; i < res.rows.length; i++){
                    var question = res.rows.item(i);
                    question.STUDYID = data['study'].ID;
                    data['questions'].push(question);
                };
            });
            txn.executeSql('SELECT * FROM questionOption WHERE studyId = ' + studyId + " ORDER BY ORDERING", [], function(tx,res){
                for(i = 0; i < res.rows.length; i++){
                    var optiion = res.rows.item(i);
                    optiion.STUDYID = data['study'].ID;
                    data['questionOptions'].push(optiion);
        	    }
            });
            txn.executeSql('SELECT * FROM expression WHERE studyId = ' + studyId, [], function(tx,res){
                expressions = [];
                for(i = 0; i < res.rows.length; i++){
                    var expression = res.rows.item(i);
                    expression.STUDYID = data['study'].ID;
                    data['expressions'].push(expression);
            	}
            });
        },
        function(txn){
            console.log(txn);
        },
        function(txn){
            $('#data').val(JSON.stringify(data));
        	console.log($('#data').val());
        	$.ajax({
        		type:'POST',
        		url:url,
                crossDomain: true,
        		data:$('#hiddenForm').serialize(),
        		success:function(data){
        			if(data.match("Upload completed.  No Errors Found")){
        				//justUploaded.push(studyId);
        				//deleteInterviews(studyId);
                        db.transaction(function (txn) {
                            txn.executeSql('UPDATE interview SET ACTIVE = 2 WHERE COMPLETED = -1 AND STUDYID = ?', [studyId], function(tx, res){
                                displayAlert('Successfully uploaded data', "alert-success");
                                for(k in interviews[studyId]){
                                    if(interviews[studyId][k].COMPLETED == -1)
                                        interviews[studyId][k].ACTIVE = 2;
                                }
                                setTimeout(function() {
                                    $route.reload();
                                }, 2000);
                            });
                        });
        			}
        		},
        		error:function(xhr, ajaxOptions, thrownError){
        			displayAlert('Error: ' + xhr.status, "alert-danger");
        			$("#uploader-" + studyId).prop('disabled', false);
        		}
        	});
        });
    }
}]);

app.controller('adminController', ['$scope', '$log', '$routeParams', '$sce', '$location', '$route', 'getServer', 'getStudies', 'importStudy', function($scope, $log, $routeParams, $sce, $location, $route, getServer, getStudies, importStudy) {
    $scope.address = "";
    $("#studyTitle").html("Admin");
    $("#questionTitle").html("");
    $("#questionMenu").addClass("hidden");
    console.log(studyList);
    $scope.studyList = studyList;
    $scope.servers = [];
    for(k in servers){
        $scope.servers.push({id:parseInt(k), address:servers[k]})
    }
    $scope.connect = function(id) {
        getStudies.result(id).then(function(data) {
            if(data == "error" || data == "failed")
                return;
            studyList[servers[id]] = JSON.parse(data);
            var names = [];
            var ids = [];
            var serverStudyids = [];
            for(k in studies){
                names.push(studies[k].NAME);
                serverStudyids.push(studies[k].SERVERSTUDYID);
                ids.push(studies[k].ID);
            }
            for(k in studyList[servers[id]]){
                var index = $.inArray(studyList[servers[id]][k].name, names);
                if(index != -1 && serverStudyids[index] == studyList[servers[id]][k].id){
                    studyList[servers[id]][k].localStudyId = ids[index];
                }
            }
            console.log(studyList);
            $route.reload();
        });
    }
    $scope.importStudy = function(serverId, studyId) {
        address = servers[serverId];
        importStudy.result(address, studyId).then(function(data) {
            console.log("importStudy:  " + address + " : " + studyId);
            data = JSON.parse(data);
            console.log(data['columns']);
            console.log(address);
            db.transaction(function (txn) {
                for(i = 0; i < tables.length; i++){
                    if(typeof data['columns'][tables[i]] == "undefined")
                        continue;
                    if($.inArray(tables[i], ["study", "interview", "answer", "alters", "graphs", "notes"]) != -1){
                        data['columns'][tables[i]][0] = "ID INTEGER PRIMARY KEY";
                    }
                    if(tables[i] == "study"){
                        if($.inArray("SERVER", data['columns'][tables[i]]) == -1)
                            data['columns'][tables[i]].push("SERVER");
                        data['columns'][tables[i]].push("SERVERSTUDYID");
                    }
                    txn.executeSql('CREATE TABLE IF NOT EXISTS ' + tables[i] + '(' + data['columns'][tables[i]].join(",") + ')', []);
                }
            },
            function(txn){
                console.log(txn);
            },
            function(txn){
                db.transaction(function (txn) {
                    data.study = objToArray(data.study);
                    data.study[28] = data.study[0];
                    data.study[0] = null;
                    data.study[27] = serverId;
                    txn.executeSql('INSERT INTO study VALUES (' +  Array(data.study.length).fill("?").join(",") + ')', data.study, function(tx, res){
                        newId = res.insertId;
                        console.log("made new study " + newId);
                    });
                },
                function(txn){
                    console.log(txn);
                },
                function(txn){
                    console.log("study created...");
                    for (k in data.questions) {
                        data.questions[k] = objToArray(data.questions[k]);
                    }
                    for (k in data.options) {
                        data.options[k] = objToArray(data.options[k]);
                    }
                    for (k in data.expressions) {
                        data.expressions[k] = objToArray(data.expressions[k]);
                    }
                    for (k in data.alterList) {
                        data.alterList[k] = objToArray(data.alterList[k]);
                    }
                    for (k in data.alterPrompts) {
                        data.alterPrompts[k] = objToArray(data.alterPrompts[k]);
                    }
                db.transaction(function (txn) {
                    txn.executeSql('SELECT * FROM study WHERE ID = ' + newId, [], function(tx, res){
                        studies[newId] = res.rows.item(0);
                    });
                    for (k in data.questions) {
                        data.questions[k][34] = newId;
                        data.questions[k][0] = parseInt(data.questions[k][0]);
                        data.questions[k][9] = parseInt(data.questions[k][9]);
                        data.questions[k][20] = parseInt(data.questions[k][20]);
                        data.questions[k][23] = parseInt(data.questions[k][23]);
                        txn.executeSql('INSERT INTO question VALUES (' + Array(data.questions[k].length).fill("?").join(",") + ')',  data.questions[k], function(){console.log("questions imported...");}, function(tx, res){console.log(tx);console.log(res);});
                    }
                    console.log("questions imported...");
                    for (k in data.options) {
                        console.log(data.options[k]);
                        data.options[k][0] = parseInt(data.options[k][0]);
                        data.options[k][6] = parseInt(data.options[k][6]);
                        data.options[k][2] = newId;
                        txn.executeSql('INSERT INTO questionOption VALUES (' + Array(data.options[k].length).fill("?").join(",") + ')',  data.options[k]);
                    }
                    console.log("options imported...");
                    for (k in data.expressions) {
                        data.expressions[k][0] = parseInt(data.expressions[k][0]);
                        data.expressions[k][7] = newId;
                        txn.executeSql('INSERT INTO expression VALUES (' + Array(data.expressions[k].length).fill("?").join(",") + ')',  data.expressions[k]);
                    }
                    console.log("expressions imported...");
                    for (k in data.alterList) {
                        data.alterList[k][0] = parseInt(data.alterList[k][0]);
                        data.alterList[k][1] = newId;
                        txn.executeSql('INSERT INTO alterList VALUES (' + Array(data.alterList[k].length).fill("?").join(",") + ')',  data.alterList[k]);
                    }
                    console.log("alterList imported...");
                    for (k in data.alterPrompts) {
                        data.alterPrompts[k][0] = parseInt(data.alterPrompts[k][0]);
                        data.alterPrompts[k][1] = newId;
                        txn.executeSql('INSERT INTO alterPrompt VALUES ("' + Array(data.alterPrompts[k].length).fill("?").join(",") + '")', data.alterPrompts[k]);
                    }
                    console.log("alter prompts imported...");
                },
                function(txn){
                    console.log(txn);
                },
                function(txn){
                    console.log("done importing...");
                    for(k in studyList[address]){
                        if(studies[newId].NAME == studyList[address][k])
                            tudyList[address][k].localStudyId = newId;
                    }
                    $route.reload();
                });
                });
            });
            if(typeof data.audioFiles != "undefined"){
                totalAudioFiles = data.audioFiles.length;
                displayAudioLoad();
                if (totalAudioFiles > 0) {
                    var a = new DirManager();
                    console.log(a);
                    a.create_r('egowebaudio/' + data.study[0] + "/EGO", console.log('created successfully'));
                    a.create_r('egowebaudio/' + data.study[0] + "/ALTER", console.log('created successfully'));
                    a.create_r('egowebaudio/' + data.study[0] + "/ALTER_PAIR", console.log('created successfully'));
                    a.create_r('egowebaudio/' + data.study[0] + "/NETWORK", console.log('created successfully'));
                    a.create_r('egowebaudio/' + data.study[0] + "/OPTION", console.log('created successfully'));
                    a.create_r('egowebaudio/' + data.study[0] + "/PREFACE", console.log('created successfully'));
                    var b = new FileManager();
                    for (var j in data.audioFiles) {
                        console.log(j);
                        b.download_file(data.audioFiles[j].url, 'egowebaudio/' + data.study[0] + '/' + data.audioFiles[j].type + '/', data.audioFiles[j].id + ".mp3", function() {
                            loadedAudioFiles++;
                            displayAudioLoad()
                        });
                    }
                }
            }
        });
    }
    $scope.addServer = function() {
        console.log("addServer: " + $scope.address);
        check = false;
        db.transaction(function (txn) {
            txn.executeSql("SELECT address FROM server WHERE address = '" + $scope.address + "'", [], function(tx, res){
                if(res.rows.length == 0)
                    check = true;
                if (check == true) {
                    // check to make sure the form is completely valid
                    getServer.result($scope.address).then(function(data) {
                        if(data == "success"){
                            console.log("connected to server");
                            db.transaction(function (txn) {
                                newId = serverMaxId + 1;
                                console.log("new server id: " + newId);
                                txn.executeSql('INSERT INTO server VALUES (?,?)', [null, $scope.address], function(tx, res){
                                    serverMaxId++;
                                    servers[newId] = $scope.address;
                                    console.log(tx);
                                    console.log(res.insertId);
                                    console.log('insert into database OK');
                                    displayAlert('Successfully added server', "alert-success");
                                    $route.reload();
                                });
                            });
                        }
                    });
                } else {
                    displayAlert('Server already exists', "alert-danger")
                }
            });
        });
    }
    $scope.editServer = function(serverId) {
        console.log("editServer: " + servers[serverId].address);
        db.transaction(function (txn) {
            address = $("#Server_" + serverId).val();
            getServer.result(address).then(function(data) {
                if(data == "success"){
                    console.log("connected to server");
                    db.transaction(function (txn) {
                        console.log("changed server address: " + serverId);
                        txn.executeSql('UPDATE server SET address = ? WHERE id = ?', [serverId, address], function(tx, res){
                            servers[serverId] = address;
                            console.log('updated database OK');
                            displayAlert('Successfully edited server address', "alert-success");
                            $route.reload();
                        });
                    });
                }
            });
        });
    }
    $scope.showForm = function(serverId) {
        $("#editServerForm_" + serverId).show();
        $("#editButton_" + serverId).hide();
    }
    $scope.deleteStudy = function(id){
    	if(interviews[id].length == 0){
        	if(confirm("Are you sure?  This will remove all interviews as well")){
        		console.log("Deleting study " + id);
                var serverStudy = studies[id];
        		console.log(serverStudy);
                db.transaction(function (txn) {
                    txn.executeSql('DELETE FROM study WHERE ID = ' + id, [], function(tx, res) {});
                    txn.executeSql('DELETE FROM question WHERE STUDYID = ' + id, [], function(tx, res) {});
                    txn.executeSql('DELETE FROM questionOption WHERE STUDYID = ' + id, [], function(tx, res) {});
                    txn.executeSql('DELETE FROM expression WHERE STUDYID = ' + id, [], function(tx, res) {});
                    txn.executeSql('DELETE FROM alterList WHERE STUDYID = ' + id, [], function(tx, res) {});
                    txn.executeSql('DELETE FROM alterPrompt WHERE STUDYID = ' + id, [], function(tx, res) {});
                });

        		var server = db.queryRowObject("SELECT * FROM server WHERE address = '" + serverStudy[1] + "'");
        		var rowdel = db.queryRow("SELECT * FROM study WHERE id = " + id);
        		db.catalog.getTable("serverstudy").deleteRow(serverStudy);
        		db.catalog.getTable("study").deleteRow(rowdel);
                for(k in studyList[serverStudy[1]]){
                    console.log(studyList[serverStudy[1]][k].id +":"+ serverStudy[2]);
                    if(studyList[serverStudy[1]][k].id == serverStudy[2])
                        studyList[serverStudy[1]][k].localStudyId = null;
                }
                console.log(studyList);
        		var questions = db.query("SELECT * FROM question WHERE studyId = " + id).data;
        		for(q in questions){
        			db.catalog.getTable("question").deleteRow(questions[q]);
        		}
        		var options = db.query("SELECT * FROM questionOption WHERE studyId = " + id).data;
        		for(r in options){
        			db.catalog.getTable("questionOption").deleteRow(options[r]);
        		}
        		var expressions = db.query("SELECT * FROM expression WHERE studyId = " + id).data;
        		for(t in expressions){
        			db.catalog.getTable("expression").deleteRow(expressions[t]);
        		}
        		var alterList = db.query("SELECT * FROM alterList WHERE studyId = " + id).data;
        		for(t in alterList){
        			db.catalog.getTable("alterList").deleteRow(alterList[t]);
        		}
        		var alterPrompt = db.query("SELECT * FROM alterPrompt WHERE studyId = " + id).data;
        		for(t in alterPrompt){
        			db.catalog.getTable("alterPrompt").deleteRow(alterPrompt[t]);
        		}
        		db.commit();
        		deleteInterviews(id, true);
                $route.reload();
    		}
    	}else{
    		alert("you must upload completed survey data before you can delete");
    	}
    }

}]);

function save(questions, page, url, scope){
    var post = node.objectify($('#answerForm'));
    if(typeof interviewId == "undefined"){
        var interview = [
            null,
            1,
            study.ID,
            0,
            Math.round(Date.now()/1000),
            ''
        ];
        var intSQL = 'INSERT INTO interview VALUES (' + Array(interview.length).fill("?").join(",") + ')';
    }else{
        var completed = parseInt(page) + 1;
        var interview = [completed, interviewId];
        var intSQL = 'UPDATE interview SET COMPLETED = ? WHERE ID = ?';
    }
    db.transaction(function (txn){
        txn.executeSql(intSQL, interview, function(tx, res){
            if(typeof interviewId == "undefined"){
                interviewId = res.insertId;
                if(typeof interviews[study.ID] == "undefined")
                    interviews[study.ID] = [];
                interviews[study.ID].push({
                    ID:interviewId,
                    ACTIVE: 1,
                    STUDYID: study.ID,
                    COMPLETED:0,
                    START_DATE:Math.round(Date.now()/1000),
                    COMPLETED_DATE:''
                });
                /*
                        if(study.FILLALTERLIST == true){
                            var names = db.queryObjects("SELECT * FROM alterList WHERE studyId = " + study.ID).data;
                            for(k in names){
                                var newId = db.queryValue("SELECT id FROM alters ORDER BY id DESC");
                                if(!newId)
                                    newId = 0;
                                newId = parseInt(newId) + 1;
                                alters[newId] = {
                                    ID: newId,
                                    ACTIVE:1,
                                    ORDERING: parseInt(db.queryValue("SELECT ordering FROM alters WHERE CONCAT(',', interviewId, ',') LIKE '%," + interviewId + ",%' ORDER BY ordering DESC")) + 1,
                                    NAME: names[k].NAME,
                                    INTERVIEWID: interviewId,
                                    ALTERLISTID: ''
                                };
                                db.catalog.getTable('alters').insertRow(objToArray(alters[newId]));
                            }
                        }
                */
                console.log("created new interview: " + interviewId);
            }else{
                console.log("continue interview: " + interviewId);
            }
        });
    },function(txn){console.log(txn)}, function(txn){
        db.transaction(function (txn){
            if(typeof questions[0] == "undefined"){
                for(k in post.ANSWER){
                    answer = post.ANSWER[k];
                    if(answer.QUESTIONTYPE == "ALTER")
                        var array_id = answer.QUESTIONID + "-" + answer.ALTERID1;
                    else if(answer.QUESTIONTYPE == "ALTER_PAIR")
                        var array_id = answer.QUESTIONID + "-" + answer.ALTERID1 + "and" + answer.ALTERID2;
                    else
                        var array_id = answer.QUESTIONID;
                    answer.VALUE = $("#Answer_" + array_id + "_VALUE").val();
                    console.log("answer value:" + answer.VALUE);
                    answer.INTERVIEWID = interviewId;
                    if(!answer.ID){
                        answers[array_id] = {
                            ID : null,
                            ACTIVE : '',
                            QUESTIONID : answer.QUESTIONID,
                            INTERVIEWID : answer.INTERVIEWID,
                            ALTERID1 : answer.ALTERID1,
                            ALTERID2 : answer.ALTERID2,
                            VALUE : answer.VALUE,
                            OTHERSPECIFYTEXT : answer.OTHERSPECIFYTEXT,
                            SKIPREASON : answer.SKIPREASON,
                            STUDYID : answer.STUDYID,
                            QUESTIONTYPE : answer.QUESTIONTYPE,
                            ANSWERTYPE : answer.ANSWERTYPE
                        };
                        var insert = objToArray(answers[array_id]);
                        txn.executeSql('INSERT INTO answer VALUES (' + Array(insert.length).fill("?").join(",") + ')', insert, function(tx, res){
                            answers[array_id].ID = res.insertId;
                            if(answers[array_id].QUESTIONTYPE == "EGO_ID"){
                                if(typeof egoAnswers[interviewId] == "undefined")
                                    egoAnswers[interviewId] = [];
                                egoAnswers[interviewId][answers[array_id].QUESTIONID] = answers[array_id].VALUE;
                            }
                            console.log(answers[array_id]);
                        }, function(tx, error){
                            console.log(tx);
                            console.log(error);
                        });
                    }else{
                        txn.executeSql('UPDATE answer SET VALUE = ?, SKIPREASON = ?, OTHERSPECIFYTExT = ? WHERE ID = ?', [answers[array_id].VALUE, answers[array_id].SKIPREASON, answers[array_id].OTHERSPECIFYTEXT, answers[array_id].ID], function(tx, res){
                            console.log("answer " + array_id + " updated");
                        });
                    }
                }
            }
            if(typeof post.CONCLUSION != "undefined" && post.CONCLUSION == 1){
                txn.executeSql('UPDATE interview SET COMPLETED = ?, COMPLETE_DATE = ? WHERE ID = ?', [-1, Math.round(Date.now()/1000), interviewId], function(tx, res){
                    for(k in interviews[study.ID]){
                        if(interviews[study.ID][k].ID == interviewId)
                            interviews[study.ID][k].COMPLETED = -1;
                    }
                    console.log("interview " + interviewId + " completed");
                });
            }
        }, null, function(txn){
            console.log("going to next page");
            if(typeof questions[0] != "undefined" && questions[0].ANSWERTYPE == "NAME_GENERATOR")
                buildList();
        	if(typeof questions[0] != "undefined" && questions[0].ANSWERTYPE == "CONCLUSION"){
        		document.location = url + "/";
        	}else{
                document.location = url + "/page/" + (parseInt(page) + 1);
            }
        });
    });
}

function saveSkip(interviewId, questionId, alterId1, alterId2, arrayId)
{
    if(typeof answers[arrayId] != "undefined" && answers[arrayId].VALUE == study.VALUELOGICALSKIP)
        return;
    var array_id = "";
    array_id = questionId;
    if(alterId1)
        array_id = array_id + "-" + alterId1;
    if(alterId2)
        array_id = array_id + "and" + alterId2;
	answers[arrayId] = {
        ID : '',
    	ACTIVE : '',
    	QUESTIONID : questionId,
    	INTERVIEWID : interviewId,
    	ALTERID1 : alterId1,
    	ALTERID2 : alterId2,
    	VALUE : study.VALUELOGICALSKIP,
    	OTHERSPECIFYTEXT : "",
    	SKIPREASON : "NONE",
    	STUDYID : study.ID,
    	QUESTIONTYPE : questions[questionId].SUBJECTTYPE,
    	ANSWERTYPE : questions[questionId].ANSWERTYPE
    };
    var insert = objToArray(answers[array_id]);
    db.transaction(function (txn) {
        txn.executeSql('INSERT INTO answer VALUES (' + Array(insert.length).fill("?").join(",") + ')', insert, function(tx, res){
        });
    });
}

function saveNodes()
{
	var nodes = {};
	for(var k in s.graph.nodes()){
		nodes[s.graph.nodes()[k].id] = s.graph.nodes()[k];
	}
	$("#Graph_nodes").val(JSON.stringify(nodes));
    var post = node.objectify($('#graph-form'));
    if(typeof graphs[expressionId] == "undefined"){
        graphs[expressionId] = post.GRAPH;
    	var newId = parseInt(db.queryValue("SELECT id FROM graphs ORDER BY id DESC"));
    	if(!newId)
    	    newId = 0;
    	graphs[expressionId].ID = newId + 1;
        console.log(graphs);

        db.catalog.getTable('graphs').insertRow(objToArray(graphs[expressionId]));
    }else{
        graphs[expressionId] = post.GRAPH;
        db.catalog.getTable('graphs').updateRow(objToArray(graphs[expressionId]));
    }
    db.commit();
}

function getInterviewIds(intId){
	var egoValue = db.queryValue("SELECT VALUE FROM answer WHERE CONCAT(',', interviewId, ',') LIKE '%," + intId + ",%' AND questionID = " + study.MULTISESSIONEGOID);
	var column = db.queryObjects("SELECT ID FROM question WHERE title = (SELECT q.title FROM question q WHERE q.ID = " + study.MULTISESSIONEGOID + ")").data;
	var multiIds = [];
	for (var k in column){
		multiIds.push(column[k].ID)
	}
	var column = db.queryObjects("SELECT INTERVIEWID FROM answer WHERE questionId in (" + multiIds.join(",") + ") AND value = '"  + egoValue + "'" ).data;
	var interviewIds = [];
	for (var k in column){
		interviewIds.push(column[k].INTERVIEWID)
	}
	return interviewIds;
}

function displayAudioLoad() {
    $('#status').html("Importing audio files: " + loadedAudioFiles + " / " +totalAudioFiles);
    if (loadedAudioFiles ==totalAudioFiles) {
        $('#status').html("Done!");
        setTimeout(function() {
            //$('#status').html("");
        }, 1000);
    }
}


string = {};
string.repeat = function(string, count)
{
	return new Array(count+1).join(string);
}

string.count = function(string)
{
	var count = 0;

	for (var i=1; i<arguments.length; i++)
	{
		var results = string.match(new RegExp(arguments[i], 'g'));
		count += results ? results.length : 0;
	}

	return count;
}

array = {};
array.merge = function(arr1, arr2)
{
	for (var i in arr2)
	{
		if (arr1[i] && typeof arr1[i] == 'object' && typeof arr2[i] == 'object')
			arr1[i] = array.merge(arr1[i], arr2[i]);
		else
			arr1[i] = arr2[i]
	}

	return arr1;
}

array.print = function(obj)
{
	var arr = [];
	$.each(obj, function(key, val) {
		var next = key + ": ";
		next += $.isPlainObject(val) ? array.print(val) : val;
		arr.push( next );
	  });

	return "{ " +  arr.join(", ") + " }";
}

node = {};

node.objectify = function(node, params)
{
	if (!params)
		params = {};

	if (!params.selector)
		params.selector = "*";

	if (!params.key)
		params.key = "name";

	if (!params.value)
		params.value = "value";

	var o = {};
	var indexes = {};

	$(node).find(params.selector+"["+params.key+"]").each(function()
	{
		var name = $(this).attr(params.key).toUpperCase(),
			value = $(this).attr(params.value);
        if(typeof $(this).attr(params.value) == "undefined")
            return;
		var obj = $.parseJSON("{"+name.replace(/([^\[]*)/, function()
		{
			return '"'+arguments[1]+'"';
		}).replace(/\[(.*?)\]/gi, function()
		{
			if (arguments[1].length == 0)
			{
				var index = arguments[3].substring(0, arguments[2]);
				indexes[index] = indexes[index] !== undefined ? indexes[index]+1 : 0;

				return ':{"'+indexes[index]+'"';
			}
			else
				return ':{"'+escape(arguments[1])+'"';
		})+':"'+value.replace(/[\\"]/gi, function()
		{
			return "\\"+arguments[0];
		})+'"'+string.repeat('}', string.count(name, ']'))+"}");

		o = array.merge(o, obj);
	});

	return o;
}

function objToArray(obj){
	var arr = [];
	for(k in obj){
		arr.push(obj[k]);
	}
	return arr;
}

justUploaded = [];

function deleteInterview(intId){
    db.transaction(function (txn) {
        txn.executeSql('DELETE FROM interview WHERE ID = ' + intId, [], function(tx, res) {
        });
        txn.executeSql('DELETE FROM alters WHERE INTERVIEWID = ' + intId, [], function(tx, res) {
        });
        txn.executeSql('DELETE FROM answer WHERE INTERVIEWID = ' + intId, [], function(tx, res) {
        });
        for(k in interviews){
            for(i = 0; i < interviews[k].length; i++){
                if(interviews[k][i].ID == intId){
                    interviews[k].splice(i, 1);
                    return;
                }
            }
        }
    });
}

function displayAlert(message, type){
    $("#status").removeClass("alert-danger");
    $("#status").removeClass("alert-success");
    $("#status").removeClass("alert-warning");
    $("#status").addClass(type);
    $("#status").html(message);
    $("#status").show();
    console.log(message);
}
