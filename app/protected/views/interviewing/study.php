<div class="view" style="width:360px;float:left;">
<h2><?php echo Study::getName($studyId); ?></h2>

<h3>
	<?php
              	 echo CHtml::link('Start new interview', $this->createUrl("/interviewing/".$studyId));
        	?>	
</h3>

<h3>Continue interview</h3>
<?php
$this->widget('zii.widgets.grid.CGridView', array(
	'id'=>'interviews',
	'dataProvider'=>$dataProvider,
	'pager'=>array(
		'header'=> '',
	),
	'summaryText'=>'',
	'columns'=>array(
		array(
			'name'=>'id',
			'header'=>'Interview',
			'type'=>'raw',
			'value'=>'CHtml::link(Interview::getEgoId($data->id), Yii::app()->createUrl("/interviewing/".$data->studyId."?interviewId=".$data->id."&page=".$data->completed))',
		),
	),
));
?>
</div>
