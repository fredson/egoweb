<?php

/* @var $this AdminController */
$this->pageTitle =  "Admin";

?>
	<table cellspacing=0 cellpadding=0 class="admin">
	<tr>
	<td width=50%>
		<h3>
		<?php
		   echo CHtml::link('Interviewing', $this->createUrl("/interview"));
		?>
		</h3>
		<p>
			Start a new interview or continue a partially completed interview.
		</p>
	</td>
	<?php if(Yii::app()->user->isAdmin): ?>
	<td>
	  <h3>
	    <?php
	       echo CHtml::link('Authoring', $this->createUrl("/authoring"));
	    ?>
	  </h3>
		<p>
			Create a new interview, add or change questions for an existing interview.
		</p>
	</td>
	</tr>
	<tr>
	<td>
		<h3>
		  <?php
		   echo CHtml::link('Data Processing', $this->createUrl("/data"));
		?>
		</h3>
		<p>
			Analyze the data from completed interviews.
		</p>
	</td>
	<td>
		<h3>		<?php
		   echo CHtml::link('Archive', $this->createUrl("/archive"));
		?></h3>
		<p>
			Archive studies that are no longer active.
		</p>
	</td>
	</tr>
	<tr>
	<td>
		<h3>
		<?php
		   echo CHtml::link('Import &amp; Export Studies', $this->createUrl("/importExport"));
?>
</h3>
		<p>
			Save study and respondent data as files for archiving or
			transferring between computers.
		</p>
	</td>
		<?php if(Yii::app()->user->isSuperAdmin): ?>
		<td>
			<h3>
			  <?php
		   echo CHtml::link('User Admin', $this->createUrl("/admin/user"));
		?>
			</h3>
			<p>
				Add new users.
			</p>
		</td>
		<?php endif; ?>
	</tr>
	<?php endif; ?>
	</tr>
	<tr>
	<td>
		<h3>
		  <?php
		     echo CHtml::link('Mobile', $this->createUrl("/Mobile"));
		  ?>
		</h3>
		<p>
			Apps for iOS and Android.
		</p>
	</td>
	<td>
		<h3>		<h3>
		<?php
		   echo CHtml::link('Logout', $this->createUrl("/site/Logout"));
		?>
		</h3></h3>
		<p>
			Logout of Admin Mode.
		</p>
	</td>
	</tr>
	</table>
	<span style="color: #fff"><?php echo Yii::app()->getBaseUrl(true);?></span>
