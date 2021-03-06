<?php

class InterviewController extends Controller
{

	/**
	 * Lists all models.
	 */
	public function actionIndex()
	{
		$condition = "id != 0";
		if(!Yii::app()->user->isSuperAdmin){
            if(Yii::app()->user->id){
                $studies = array();
                $criteria = new CDbCriteria;
                $criteria->condition = "interviewerId = " . Yii::app()->user->id;
                $interviewers = Interviewer::model()->findAll($criteria);
                foreach($interviewers as $interviewer){
                    $studies[] = $interviewer->studyId;
                }
            }else{
                $studies = false;
            }
			if($studies)
				$condition = "id IN (" . implode(",", $studies) . ")";
			else
				$condition = "id = -1";
		}

		$criteria = array(
			'condition'=>$condition . " AND multiSessionEgoId = 0 AND active = 1",
			'order'=>'id DESC',
		);

		$single = Study::model()->findAll($criteria);

		$criteria = array(
			'condition'=>$condition . " AND multiSessionEgoId <> 0 AND active = 1",
			'order'=>'multiSessionEgoId DESC',
		);

		$multi = Study::model()->findAll($criteria);

		$this->render('index',array(
			'single'=>$single,
			'multi'=>$multi,
		));
	}

	public function actionStudy($id)
	{
        $criteria = array(
            'condition'=>"studyId = $id and useAlterListField in ('name','email','id')",
        );
        $egoIdQ = Question::model()->find($criteria);
        $restrictions = "";
        if($egoIdQ){
            $criteria = new CDbCriteria;
            $criteria = array(
                'condition'=>"interviewerId = " . Yii::app()->user->id,
            );
            $participantList =  AlterList::model()->findAll($criteria);
            $participants = array();
            foreach($participantList as $p){
                if($egoIdQ->useAlterListField == "email")
                    $participants[] = $p->email;
                elseif($egoIdQ->useAlterListField == "name")
                    $participants[] = $p->name;
            }
            if($participants){
                $criteria = array(
                    'condition'=>"questionId = " .$egoIdQ->id,
                );
                $answers = Answer::model()->findAll($criteria);
                foreach($answers as $answer){
                    if(in_array($answer->value, $participants))
                        $interviewIds[] = $answer->interviewId;
                }
                if($interviewIds)
                    $restrictions = ' and id in (' . implode(",", $interviewIds) . ')';
                else
                    $restrictions = ' and id = -1';
            }
        }
        if(Yii::app()->user->isSuperAdmin)
            $restrictions = "";
		$criteria=array(
			'condition'=>'completed > -1 AND studyId = '.$id . $restrictions,
			'order'=>'id DESC',
		);
		$dataProvider=new CActiveDataProvider('Interview',array(
			'criteria'=>$criteria,
		));
		$this->renderPartial('study', array(
			'dataProvider'=>$dataProvider,
			'studyId'=>$id,
		),false,false);
	}

	/**
	 * Main page.
	 */
	public function actionView($id)
	{
        if($id == 0 && isset($_GET["study"])){
          $study = Study::model()->findByAttributes(array("name"=>$_GET["study"]));
          $interview = new Interview;
          $interview->studyId = $study->id;
          if($interview->save()){
            $interviewId = $interview->id;
            $egoQs = Question::model()->findAllByAttributes(array("subjectType"=>"EGO_ID", "studyId"=>$study->id));
            foreach($egoQs as $q){
              if(!isset($_GET[$q->title]))
                continue;
              $a = $q->id;
              $answers[$a] = new Answer;
              $answers[$a]->interviewId = $interview->id;
              $answers[$a]->studyId = $study->id;
              $answers[$a]->questionType = "EGO_ID";
              $answers[$a]->answerType = $q->subjectType;
              $answers[$a]->questionId = $q->id;
              $answers[$a]->skipReason = "NONE";
              $answers[$a]->value = $_GET[$q->title];
              $answers[$a]->save();
            }
            $this->redirect("/interview/".$study->id."/". $interview->id . "/#/page/1/");
          }
        }
        $study = Study::model()->findByPk($id);
        if ($study->multiSessionEgoId){
            $criteria = array(
                "condition"=>"title = (SELECT title FROM question WHERE id = " . $study->multiSessionEgoId . ")",
            );
            $questions = Question::model()->findAll($criteria);
            $multiIds = array();
            foreach($questions as $question){
                $check = Study::model()->findByPk($question->studyId);
                if($check->multiSessionEgoId != 0)
                    $multiIds[] = $question->studyId;
            }
        }else{
            $multiIds = $study->id;
        }
        $this->pageTitle = $study->name;
        $expressions = array();
        $results = Expression::model()->findAllByAttributes(array("studyId"=>$multiIds));
        foreach($results as $result)
            $expressions[$result->id] = mToA($result);
        $questions = array();
        $audio = array();
        if(file_exists(Yii::app()->basePath."/../audio/".$study->id . "/STUDY/ALTERPROMPT.mp3"))
            $audio['ALTERPROMPT'] = "/audio/".$study->id . "/STUDY/ALTERPROMPT.mp3";
        $results = Question::model()->findAllByAttributes(array("studyId"=>$multiIds), array('order'=>'ordering'));
        $ego_questions = array();
        $alter_questions = array();
        $alter_pair_questions = array();
        $name_gen_questions = array();
        $network_questions = array();
        $questionList = array();
        foreach($results as $result){
            $questions[$result->id] = mToA($result);
            if($result->studyId == $study->id && $result->subjectType != "EGO_ID")
                $questionList[] = mToA($result);
            if(file_exists(Yii::app()->basePath."/../audio/".$study->id . "/PREFACE/" . $result->id . ".mp3"))
                $audio['PREFACE_' . $result->id] = "/audio/".$study->id . "/PREFACE/" . $result->id . ".mp3";
            if(file_exists(Yii::app()->basePath."/../audio/".$study->id . "/" . $result->subjectType . "/" . $result->id . ".mp3"))
                $audio[$result->subjectType . $result->id] = "/audio/".$study->id . "/" . $result->subjectType . "/" . $result->id . ".mp3";
            if($id == $result->studyId){
                if($result->subjectType == "EGO_ID")
                    $ego_id_questions[] = mToA($result);
                if($result->subjectType == "EGO")
                    $ego_questions[] = mToA($result);
                if($result->subjectType == "NAME_GENERATOR")
                    $name_gen_questions[] = mToA($result);
                if($result->subjectType == "ALTER")
                    $alter_questions[] = mToA($result);
                if($result->subjectType == "ALTER_PAIR")
                    $alter_pair_questions[] = mToA($result);
                if($result->subjectType == "NETWORK")
                    $network_questions[] = mToA($result);
            }
        }
        $options = array();
        $results = QuestionOption::model()->findAllByAttributes(array("studyId"=>$id));
        foreach($results as $result){
    	    if(file_exists(Yii::app()->basePath."/../audio/". $study->id . "/OPTION/" . $result->id . ".mp3"))
                $audio['OPTION' . $result->id] = "/audio/".$study->id . "/OPTION/" . $result->id . ".mp3";
            $options[$result->questionId][$result->ordering] = mToA($result);
        }
        $answers = array();
        $interviewId = false;
        $interview = false;
        $participantList = array();
        $otherGraphs = array();
        $alters = array();
        $prevAlters = array();
        $alterPrompts = array();
        $graphs = array();
        $notes = array();
        $results = AlterList::model()->findAllByAttributes(array("studyId"=>$id));
        foreach($results as $result){
            $participantList[] = mToA($result);
        }
        if(isset($_GET['interviewId'])){
            $interviewId = $_GET['interviewId'];
            $interview = Interview::model()->findByPk($_GET['interviewId']);
    		$interviewIds = Interview::multiInterviewIds($_GET['interviewId'], $study);
    		$prevIds = array();
    		if(is_array($interviewIds))
        		$prevIds = array_diff($interviewIds, array($interviewId));
    		if(is_array($interviewIds)){
    		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interviewIds));
                foreach($network_questions as $nq){
                    if(!isset($otherGraphs[$nq['ID']]))
                        $otherGraphs[$nq['ID']] = array();
                    foreach($interviewIds as $i_id){
                        if($i_id == $interviewId)
                            continue;
                        $graphId = "";
                        $s = Study::model()->findByPk($interview->studyId);
                        $criteria = array(
                            "condition"=>"title = '" . $nq['TITLE'] . "' AND studyId = " . $s->id,
                        );
                        $question = Question::model()->find($criteria);
                        $networkExprId = $question->networkRelationshipExprId;
                        if($networkExprId){
                            $criteria = array(
                                "condition"=>"expressionId = " . $networkExprId  . " AND interviewId = " . $i_id,
                            );
                            $graphId = Graph::model()->find($criteria);
                        }
                        if($graphId){
                            $otherGraphs[$nq['ID']][] = array(
                                "interviewId" => $i_id,
                                "expressionId" => $networkExprId,
                                "studyName" => $s->name,
                            );
                        }
                    }
                    //echo '<br><a href="#" onclick="print(' . $networkExprId . ','. $interviewId . ')">' . $study->name . '</a>';
                }
    		}else{
    		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$_GET['interviewId']));
            }
            $results = AlterPrompt::model()->findAllByAttributes(array("studyId"=>$id));
            foreach($results as $result){
                if(!$result->questionId)
                    $result->questionId = 0;
                $alterPrompts[$result->questionId][$result->afterAltersEntered] = $result->display;
            }
    		foreach($answerList as $answer){
    			if($answer->alterId1 && $answer->alterId2)
    				$array_id = $answer->questionId . "-" . $answer->alterId1 . "and" . $answer->alterId2;
    			else if ($answer->alterId1 && ! $answer->alterId2)
    				$array_id = $answer->questionId . "-" . $answer->alterId1;
    			else
    				$array_id = $answer->questionId;
                $answers[$array_id] = mToA($answer);
    		}
    		foreach($prevIds as $i_id){
    			$criteria = array(
    				'condition'=>"FIND_IN_SET(" . $i_id .", interviewId)",
    				'order'=>'ordering',
    			);
    			$results = Alters::model()->findAll($criteria);
    			foreach($results as $result){
        			$prevAlters[$result->id] = mToA($result);
    			}
            }
    		if(isset($_GET['interviewId']) && $study->fillAlterList){
                $criteria = array(
                    "condition"=>"interviewId = " . $interviewId,
                );
                $check = Alters::model()->findAll($criteria);
    			if(count($check) > 0){
                    $criteria = array(
                        "condition"=>"studyId = " . $study->id,
                    );
                    $alterList = AlterList::model()->findAll($criteria);
                    $names = array();
                    foreach($alterList as $a){
                        $names[] = $a->name;
                    }
    				$count = 0;
    				foreach($names as $name){
    					$alter = new Alters;
    					if(strlen($name) >= 8)
        					$alter->name = decrypt($name);
        				else
        				    continue;
    					$alter->ordering = $count;
    					$alter->interviewId = $interviewId;
    					$alter->save();
    					$count++;
    				}
    			}
    		}
    		$alters = array();
			$criteria = array(
				'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
				'order'=>'ordering',
			);
			$results = Alters::model()->findAll($criteria);
			foreach($results as $result){
    			if(isset($prevAlters[$result->id]))
    			    unset($prevAlters[$result->id]);
    			$alters[$result->id] = mToA($result);
			}
			$results = Graph::model()->findAllByAttributes(array('interviewId'=>$interviewId));
			foreach($results as $result){
    			$graphs[$result->expressionId] = mToA($result);
			}
    		$results = Note::model()->findAllByAttributes(array("interviewId"=>$interviewId));
    		foreach($results as $result){
    			$notes[$result->expressionId][$result->alterId] = $result->notes;
    		}
        }
        if(count($prevAlters) == 0)
            $prevAlters = new stdClass();
        if(count($alters) == 0)
            $alters = new stdClass();
        $this->render('view', array(
                "study"=>json_encode(mToA($study)),
                "questions"=>json_encode($questions),
                "ego_id_questions"=>json_encode($ego_id_questions),
                "ego_questions"=>json_encode($ego_questions),
                "name_gen_questions"=>json_encode($name_gen_questions),
                "alter_questions"=>json_encode($alter_questions),
                "alter_pair_questions"=>json_encode($alter_pair_questions),
                "network_questions"=>json_encode($network_questions),
                //"no_response_questions"=>json_encode($no_response_questions),
                "expressions"=>json_encode($expressions),
                "options"=>json_encode($options),
                "interviewId" => $interviewId,
                "interview" => json_encode($interview ? mToA($interview) : false),
                "answers"=>json_encode($answers),
                "alterPrompts"=>json_encode($alterPrompts),
                "alters"=>json_encode($alters),
                "prevAlters"=>json_encode($prevAlters),
                "graphs"=>json_encode($graphs),
                "allNotes"=>json_encode($notes),
                "participantList"=>json_encode($participantList),
                "questionList"=>json_encode($questionList),
                "questionTitles"=>json_encode($study->questionTitles()),
                "audio"=>json_encode($audio),
                "otherGraphs"=>json_encode($otherGraphs),
            )
        );
	}

	public function actionSave()
	{
        $errors = 0;
        $key = "";
        if(isset($_POST["hashKey"]))
            $key = $_POST["hashKey"];
        if(isset($_POST["studyId"]))
            $study = Study::model()->findByPK($_POST["studyId"]);
        $interviewId = null;
		foreach($_POST['Answer'] as $Answer){

            if($Answer['interviewId'])
                $interviewId = $Answer['interviewId'];

            if($interviewId && !isset($answers)){
            	$answers = array();
        		$interviewIds = Interview::multiInterviewIds($interviewId, $study);
        		if(is_array($interviewIds))
        		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interviewIds));
        		else
        		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interviewId));
        		foreach($answerList as $answer){
        			if($answer->alterId1 && $answer->alterId2)
        				$answers[$answer->questionId . "-" . $answer->alterId1 . "and" . $answer->alterId2] = $answer;
        			else if ($answer->alterId1 && ! $answer->alterId2)
        				$answers[$answer->questionId . "-" . $answer->alterId1] = $answer;
        			else
        				$answers[$answer->questionId] = $answer;
        		}
            }
			if($Answer['questionType'] == "ALTER")
				$array_id = $Answer['questionId'] . "-" . $Answer['alterId1'];
			else if($Answer['questionType'] == "ALTER_PAIR")
				$array_id = $Answer['questionId'] . "-" . $Answer['alterId1'] . "and" . $Answer['alterId2'];
			else
				$array_id = $Answer['questionId'];

        $loadGuest = false;
			if($Answer['questionType'] == "EGO_ID" && $Answer['value'] != "" && !$interviewId){
				if(Yii::app()->user->isGuest){
					foreach($_POST['Answer'] as $ego_id){
						$array_id = $ego_id['questionId'];
						$answers[$array_id] = new Answer;
						$answers[$array_id]->attributes = $ego_id;
						$ego_id_q = Question::model()->findByPk($ego_id['questionId']);
						if(in_array($ego_id_q->useAlterListField, array("name", "email"))){
							$keystr = $ego_id['value'];
						}
					}
					if(!$key || ($key && User::hashPassword($keystr) != $key)){
						$errors++;
						break;
					}
          $loadGuest = true;
				}

				if($errors == 0){
					if(Yii::app()->user->isGuest && isset($keystr)){
						$interview = Interview::getInterviewFromEmail($Answer['studyId'], $keystr);
            if(!$interview){
                $interview = new Interview;
                $interview->studyId = $Answer['studyId'];
                $loadGuest = false;
            }
					}else{
    					$interview = new Interview;
    					$interview->studyId = $Answer['studyId'];
          }
					if($interview->save()){
    					$randoms = Question::model()->findAllByAttributes(array("answerType"=>"RANDOM_NUMBER", "studyId"=>$Answer['studyId']));
    					foreach($randoms as $q){
        				    $a = $q->id;
                            $answers[$a] = new Answer;
                            $answers[$a]->interviewId = $interview->id;
                            $answers[$a]->studyId = $Answer['studyId'];
                            $answers[$a]->questionType = "EGO_ID";
                            $answers[$a]->answerType = "RANDOM_NUMBER";
                            $answers[$a]->questionId = $q->id;
                            $answers[$a]->skipReason = "NONE";
                            $answers[$a]->value = mt_rand ($q->minLiteral , $q->maxLiteral);
                            $answers[$a]->save();
    					}
						$interviewId = $interview->id;
					}else{
						print_r($interview->errors);
						die();
					}
				}
			}
			if(!isset($answers[$array_id]))
                $answers[$array_id] = new Answer;
			$answers[$array_id]->attributes = $Answer;
			if($interviewId){
				$answers[$array_id]->interviewId = $interviewId;
				$answers[$array_id]->save();
				if(strlen($answers[$array_id]->value) >= 8)
				    $answers[$array_id]->value = decrypt( $answers[$array_id]->value);
				if(strlen($answers[$array_id]->otherSpecifyText) >= 8)
				    $answers[$array_id]->otherSpecifyText = decrypt( $answers[$array_id]->otherSpecifyText);

			}
        }
		$interview = Interview::model()->findByPk((int)$interviewId);
		if($loadGuest == false && $interview && $interview->completed != -1 && is_numeric($_POST['page'])){
			$interview->completed = (int)$_POST['page'];
			$interview->save();
		}
        if($interview)
            $json["interview"] = mToA($interview);
		foreach($answers as $index => $answer){
    		$json["answers"][$index] = mToA($answer);
		}

		if(isset($_POST['conclusion'])){
			$interview = Interview::model()->findByPk((int)$interviewId);
			$interview->completed = -1;
			$interview->complete_date = time();
			$interview->save();

			if(isset(Yii::app()->params['exportFilePath']) && Yii::app()->params['exportFilePath'])
				$this->exportInterview($interview->id);
		}

		if($errors == 0)
    		echo json_encode($json);
        else
            echo "error";
    }

	public function actionAlter(){
		if(isset($_POST['Alters'])){
            $interview = Interview::model()->findByPk($_POST['Alters']['interviewId']);
			$studyId = $interview->studyId;
			$criteria=array(
				'condition'=>"FIND_IN_SET(" . $_POST['Alters']['interviewId'] .", interviewId)",
				'order'=>'ordering',
			);
			$alters = Alters::model()->findAll($criteria);
			$alterNames = array();
            $alterGroups = array();
			foreach($alters as $alter){
				$alterNames[$alter->id] = $alter->name;
                $alterGroups[$alter->name] = explode(",", $alter->nameGenQIds);
			}
			$model = new Alters;
			$model->attributes = $_POST['Alters'];
			if(in_array($_POST['Alters']['name'], $alterNames)){
                if(!in_array($_POST['Alters']['nameGenQIds'], $alterGroups[$_POST['Alters']['name']])){
                    $model = Alters::model()->findByPk(array_search($_POST['Alters']['name'], $alterNames));
                    $alterGroups[$_POST['Alters']['name']][] = $_POST['Alters']['nameGenQIds'];
                    $model->nameGenQIds = implode(",", $alterGroups[$_POST['Alters']['name']]);
                }else{
                    $model->addError('name', $_POST['Alters']['name']. ' has already been added!');
                }
            }

            $pre_names = array();
            $preset_alters = AlterList::model()->findAllByAttributes(array("studyId"=>$studyId));
            foreach($preset_alters as $alter){
                $pre_names[] = $alter->name;
            }
            #OK FOR SQL INJECTION
			$study = Study::model()->findByPk((int)$studyId);

			// check to see if pre-defined alters exist.  If they do exist, check name against list
			if($study->useAsAlters){
                #OK FOR SQL INJECTION
				if(count($pre_names) > 0){
                    #OK FOR SQL INJECTION
                    $params = new stdClass();
                    $params->name = ':name';
                    $params->value = encrypt($_POST['Alters']['name']);
                    //echo encrypt($_POST['Alters']['name']);

                    $params->dataType = PDO::PARAM_STR;
        			if(!in_array($_POST['Alters']['name'], $pre_names) && $study->restrictAlters){
						$model->addError('name', $_POST['Alters']['name']. ' is not in our list of participants');
                    }
				}
			}

            $foundAlter = false;
			if(isset($study->multiSessionEgoId) && $study->multiSessionEgoId){
                $interviewIds = Interview::multiInterviewIds($_POST['Alters']['interviewId'], $study);
				//$interviewIds = array_diff(array_unique($interviewIds), array($_POST['Alters']['interviewId']));

                foreach($interviewIds as $iId){
                    $criteria=array(
                        'condition'=>"FIND_IN_SET (" . $iId . ", interviewId) ",
                    );
                    $alters = Alters::model()->findAll($criteria);
                    foreach($alters as $alter){
                        if($alter->name == $_POST['Alters']['name']){
                            $intIds = explode(",", $alter->interviewId);
                            $nameQIds = explode(",", $alter->nameGenQIds);
                            if(!in_array($_POST['Alters']['interviewId'], $intIds))
                                $alter->interviewId = $alter->interviewId . ",". $_POST['Alters']['interviewId'];
                            if(!in_array($_POST['Alters']['nameGenQIds'], $nameQIds))
                                $alter->nameGenQIds = $alter->nameGenQIds . ",". $_POST['Alters']['nameGenQIds'];
                            $alter->save();
                            $foundAlter = true;
                        }

                    }
                }
			}
			$criteria=new CDbCriteria;
			$criteria->condition = ('interviewId = '.$_POST['Alters']['interviewId']);
			$criteria->select='count(ordering) AS ordering';
			$row = Alters::model()->find($criteria);
			$model->ordering = $row['ordering'];
			if(!$model->getError('name') && $foundAlter == false)
				$model->save();
			$interviewId = $_POST['Alters']['interviewId'];

			$criteria=new CDbCriteria;
			$criteria=array(
				'condition'=>"afterAltersEntered <= " . Interview::countAlters($interviewId),
				'order'=>'afterAltersEntered DESC',
			);
			$alterPrompt = AlterPrompt::getPrompt($studyId, Interview::countAlters($interviewId));

    		$alters = array();
			$criteria = array(
				'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
				'order'=>'ordering',
			);
			$results = Alters::model()->findAll($criteria);
			foreach($results as $result){
    			$alters[$result->id] = mToA($result);
			}

			echo json_encode($alters);

		}
	}

	public function actionDeletealter()
	{
		if(isset($_POST['Alters'])){
			$model = Alters::model()->findByPk((int)$_POST['Alters']['id']);
			$interviewId = $_POST['Alters']['interviewId'];
            $nameQId = $_POST['Alters']['nameGenQId'];
            $interview = Interview::model()->findByPk($interviewId);
            $name_gen_questions = Question::model()->findAllByAttributes(array("studyId"=>$interview->studyId,"subjectType"=>"NAME_GENERATOR"));
            $nameQIds = array();
            foreach($name_gen_questions as $question){
                $nameQIds[] = $question->id;
            }
			if($model){
				$ordering = $model->ordering;
				if(strstr($model->interviewId, ",")){
                    $nameGenQIds = explode(",", $model->nameGenQIds);
                    $checkRemain = false;
                    foreach($nameGenQIds as $nameGenQId){
                        if($nameQId != $nameGenQId && in_array($nameGenQId, $nameQIds))
                            $checkRemain = true;
                    }
                    $nameGenQIds = array_diff($nameGenQIds,array($nameQId));
                    $model->nameGenQIds = implode(",", $nameGenQIds);
                    if($checkRemain == false){
                        $interviewIds = explode(",", $model->interviewId);
    					$interviewIds = array_diff($interviewIds,array($interviewId));
    					$model->interviewId = implode(",", $interviewIds);
                    }
                    $model->save();
				}else{
                    if(strstr($model->nameGenQIds, ",")){
                        $nameGenQIds = explode(",", $model->nameGenQIds);
    					$nameGenQIds = array_diff($nameGenQIds,array($nameQId));
    					$model->nameGenQIds = implode(",", $nameGenQIds);
    					$model->save();
                    }else{
    					$model->delete();
    				}
                }

				Alters::sortOrder($ordering, $interviewId);
			}

    		$alters = array();
			$criteria = array(
				'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
				'order'=>'ordering',
			);
			$results = Alters::model()->findAll($criteria);
			foreach($results as $result){
    			$alters[$result->id] = mToA($result);
			}

			echo json_encode($alters);
		}
	}

	/**
	 * Exports study to file (added for LIM)
	 * @param $id ID of interview to be exported
	 */
	protected function exportInterview($id)
	{
		$result = Interview::model()->findByPk($id);
		$study = Study::model()->findByPk($result->studyId);
		$text = $study->export(array($id));
		$file = fopen(Yii::app()->params['exportFilePath'] . Interview::getEgoId($id) . ".study", "w") or die("Unable to open file!");
		fwrite($file, $text);
		fclose($file);
	}
}
