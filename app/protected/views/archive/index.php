<!-- defining urls for restore, delete --> 
<?php
Yii::app()->clientScript->registerScript('helpers', '
        deleteUrl = '.CJSON::encode(Yii::app()->createUrl('/authoring/delete/'.$data->id)).';
        restoreUrl = '.CJSON::encode(Yii::app()->createUrl('/authoring/restore/'.$data->id)).';
');?>

<div class="view" style="width:360px;float:left;margin-right:30px">
	<h2>Single Session Studies</h2>
	<?php foreach($single as $data): ?>
	<?php echo CHtml::encode($data->name); ?>

		<?php echo CHtml::button(
			"Restore",
			array(
				"class"=>"btn btn-primary btn-sm pull-right",
				"onclick"=>"js:document.location.href=restoreUrl"
			)
		); ?>
		<?php echo CHtml::button(
			"Delete",
			array(
				"class"=>"btn btn-danger btn-sm pull-right",
				"onclick"=>"js:if(confirm('Are you sure you want to delete this study?')){document.location.href=deleteUrl}"
			)
		); ?>


	<?php endforeach; ?>
</div>


<div class="view" style="width:360px;float:left;margin-right:30px">
	<h2>Multi Session Studies</h2>
	<?php foreach($multi as $data): ?>
	<?php echo CHtml::encode($data->name); ?>
		<?php echo CHtml::button(
			"Restore",
			array(
				"class"=>"btn btn-primary btn-sm pull-right",
				"onclick"=>"js:document.location.href=restoreUrl"
			)
		); ?>
		<?php echo CHtml::button(
			"Delete",
			array(
				"class"=>"btn btn-danger btn-sm pull-right",
				"onclick"=>"js:if(confirm('Are you sure you want to delete this study?')){document.location.href=deleteUrl}"
			)
		); ?>

	<?php endforeach; ?>
</div>
