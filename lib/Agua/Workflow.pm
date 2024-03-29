use MooseX::Declare;

=head2

	PACKAGE		Workflow
	
	PURPOSE
	
		THE Workflow OBJECT PERFORMS THE FOLLOWING TASKS:
		
			1. SAVE WORKFLOWS
			
			2. RUN WORKFLOWS
			
			3. PROVIDE WORKFLOW STATUS

	NOTES

		Workflow::executeWorkflow
			|
			|
			|
			|
		Workflow::runStages
				|
				|
				|
				-> 	my $stage = Agua::Stage->new()
					...
					|
					|
					-> $stage->run() 
						|
						|
						? DEFINED 'CLUSTER' AND 'SUBMIT'
						|				|
						|				|
						|				YES ->  Agua::Stage::runOnCluster() 
						|
						|
						NO ->  Agua::Stage::runLocally()

=cut

use strict;
use warnings;
use Carp;

class Agua::Workflow with Agua::Common {

#### EXTERNAL MODULES
use Data::Dumper;
use FindBin::Real;
use lib FindBin::Real::Bin() . "/lib";

#### INTERNAL MODULES	
use Agua::DBaseFactory;
use Conf::Agua;
use Agua::Stage;
use Agua::StarCluster;
use Agua::Instance;
use Agua::Monitor::SGE;

# Integers
has 'SHOWLOG'		=>  ( isa => 'Int', is => 'rw', default => 1 );  
has 'PRINTLOG'		=>  ( isa => 'Int', is => 'rw', default => 5 );
has 'workflowpid'	=> ( isa => 'Int|Undef', is => 'rw', required => 0 );
has 'workflownumber'=>  ( isa => 'Str|Undef', is => 'rw' );
has 'start'     	=>  ( isa => 'Int|Undef', is => 'rw' );
has 'stop'     		=>  ( isa => 'Int|Undef', is => 'rw' );
has 'submit'  		=>  ( isa => 'Int|Undef', is => 'rw' );
has 'validated'		=> ( isa => 'Int|Undef', is => 'rw', default => 0 );

# Strings
has 'random'		=> ( isa => 'Str|Undef', is => 'rw', required	=> 	0	);
has 'configfile'	=> ( isa => 'Str|Undef', is => 'rw', default => '' );
has 'installdir'	=> ( isa => 'Str|Undef', is => 'rw', default => '' );
has 'fileroot'		=> ( isa => 'Str|Undef', is => 'rw', default => '' );
has 'qstat'			=> ( isa => 'Str|Undef', is => 'rw', default => '' );
has 'queue'			=>  ( isa => 'Str|Undef', is => 'rw', default => 'default' );
has 'cluster'		=>  ( isa => 'Str|Undef', is => 'rw', default => '' );
has 'username'  	=>  ( isa => 'Str', is => 'rw' );
has 'password'  	=>  ( isa => 'Str', is => 'rw' );
has 'sessionId'     => ( isa => 'Str|Undef', is => 'rw' );
has 'workflow'  	=>  ( isa => 'Str', is => 'rw' );
has 'project'   	=>  ( isa => 'Str', is => 'rw' );
has 'outputdir'		=>  ( isa => 'Str', is => 'rw' );
has 'keypairfile'	=> ( is  => 'rw', 'isa' => 'Str|Undef', required	=>	0	);
has 'keyfile'		=> ( isa => 'Str|Undef', is => 'rw'	);

# Objects
has 'ssh'			=> ( isa => 'Agua::Ssh', is => 'rw', required	=>	0	);
has 'opsinfo'		=> ( isa => 'Agua::OpsInfo', is => 'rw', required	=>	0	);
has 'jsonparser'	=> ( isa => 'JSON', is => 'rw', required => 0 );
has 'json'			=> ( isa => 'HashRef', is => 'rw', required => 0 );
has 'db'		=> ( isa => 'Agua::DBase::MySQL', is => 'rw', required => 0 );
has 'stages'		=> 	( isa => 'ArrayRef', is => 'rw', required => 0 );
has 'stageobjects'	=> 	( isa => 'ArrayRef', is => 'rw', required => 0 );
has 'monitor'		=> 	( isa => 'Maybe|Undef', is => 'rw', required => 0 );
has 'conf' 	=> (
	is =>	'rw',
	isa => 'Conf::Agua',
	default	=>	sub { Conf::Agua->new(	backup	=>	1, separator => "\t"	);	}
);

has 'starcluster'	=> (
	is =>	'rw',
	isa => 'Agua::StarCluster'
);
has 'head' 	=> (
	is =>	'rw',
	'isa' => 'Agua::Instance',
	default	=>	sub { Agua::Instance->new({});	}
	#default	=>	sub { Agua::Instance->new({SHOWLOG=>5, PRINTLOG=>5});	}
);
has 'master' 	=> (
	is =>	'rw',
	'isa' => 'Agua::Instance',
	default	=>	sub { Agua::Instance->new({});	}
	#default	=>	sub { Agua::Instance->new({SHOWLOG=>5, PRINTLOG=>5});	}
);

####////}}}

method BUILD ($hash) {
}

method initialise ($json) {
	#### SET LOG
	my $username 	=	$json->{username};
	my $logfile 	= 	$json->{logfile};
	my $mode		=	$json->{mode};
	$self->logDebug("logfile", $logfile);
	$self->logDebug("mode", $mode);
	if ( not defined $logfile or not $logfile ) {
		my $identifier 	= 	"workflow";
		$self->setUserLogfile($username, $identifier, $mode);
		$self->appendLog($logfile);
	}

	#### IF JSON IS DEFINED, ADD VALUES TO SLOTS
	$self->json($json);
	if ( $json ) {
		foreach my $key ( keys %{$json} ) {
			$json->{$key} = $self->unTaint($json->{$key});
			$self->$key($json->{$key}) if $self->can($key);
		}
	}
	$self->logDebug("json", $json);	
		
	#### SET CLUSTER INSTANCES LOG
	$self->head()->logfile($logfile);
	$self->head()->SHOWLOG($self->SHOWLOG());
	$self->head()->PRINTLOG($self->PRINTLOG());
	$self->master()->logfile($logfile);
	$self->master()->SHOWLOG($self->SHOWLOG());
	$self->master()->PRINTLOG($self->PRINTLOG());
	
	#### SET HEADNODE OPS LOG
	$self->head()->ops()->logfile($logfile);	
	$self->head()->ops()->SHOWLOG($self->SHOWLOG());
	$self->head()->ops()->PRINTLOG($self->PRINTLOG());

	#### SET HEADNODE OPS CONF
	my $conf 	= 	$self->conf();
	$self->head()->ops()->conf($conf);	

	#### SET MASTER OPS LOG
	$self->master()->ops()->logfile($logfile);	
	$self->master()->ops()->SHOWLOG($self->SHOWLOG());
	$self->master()->ops()->PRINTLOG($self->PRINTLOG());

	#### SET MASTER OPS CONF
	$self->master()->ops()->conf($conf);	
	
	#### SET DATABASE HANDLE
	$self->logDebug("Doing self->setDbh");
	$self->setDbh();
    
	#### VALIDATE
	$self->logDebug("mode", $mode);
    $self->logError("User session not validated for username: $username") and exit unless $mode eq "submitLogin" or $self->validate();

	#### SET WORKFLOW PROCESS ID
	$self->workflowpid($$);	

	#### SET CLUSTER IF DEFINED
	$self->logError("Agua::Workflow::BUILD    conf->getKey(agua, CLUSTERTYPE) not defined") if not defined $self->conf()->getKey('agua', 'CLUSTERTYPE');    
	$self->logError("Agua::Workflow::BUILD    conf->getKey(cluster, QSUB) not defined") if not defined $self->conf()->getKey('cluster', 'QSUB');
	$self->logError("Agua::Workflow::BUILD    conf->getKey(cluster, QSTAT) not defined") if not defined $self->conf()->getKey('cluster', 'QSTAT');
}

method setUserLogfile ($username, $identifier, $mode) {
	my $installdir = $self->conf()->getKey("agua", "INSTALLDIR");
	
	return "$installdir/log/$username.$identifier.$mode.log";
}

#### EXECUTE WORKFLOW
method executeWorkflow () {
=head2

	SUBROUTINE		executeWorkflow
	
	PURPOSE
	
		EXECUTE THE WORKFLOW
        
		Agua::Workflow.pm -> executeWorkflow()
		|
		|
		-> Agua::Workflow.pm -> runStages()
			|
			| has many Agua::Stages
			|
			-> Agua::Stage -> run()
				| 
				|
				-> Agua::Stage -> execute() LOCAL JOB
				|
				OR
				|
				-> Agua::Stage -> clusterSubmit()  CLUSTER JOB
			
=cut

    my $json        =	$self->json();
	my $username 	=	$json->{username};
	my $cluster 	=	$json->{cluster};
	my $project 	=	$json->{project};
	my $workflow 	=	$json->{workflow};
	my $workflownumber 	=	$json->{workflownumber};
	my $start 		=	$json->{start};
	my $submit 		= 	$json->{submit};

	$self->logDebug("submit", $submit);

	#### QUIT IF INSUFFICIENT INPUTS
	if ( not $username or not $project or not $workflow or not $workflownumber or not $start ) {
		my $error = '';
		$error .= "username not defined:" if not defined $username;
		$error .= "project not defined:" if not defined $project;
		$error .= "workflow not defined:" if not defined $workflow;
		$error .= "workflownumber not defined:" if not defined $workflownumber;
		$error .= "start not defined:" if not defined $start;
		$self->logError("Cannot run workflow $project.$workflow: $error") and return;
	}
	#### QUIT IF RUNNING ALREADY
	elsif ( $self->workflowIsRunning($username, $project, $workflow) ) {
		$self->logError("running") and return;
	}
	
	#### QUIT IF submit BUT cluster IS EMPTY
	elsif ( $submit and not $cluster ) {
		$self->logError("Cannot run workflow $project.$workflow: cluster not defined") and return;
	}
	elsif ( $submit and not defined $self->getAws($username) ) {
		$self->logError("No AWS credentials for username $username") and return;
	}
	
	my $pid;
	if ( $pid = fork() ) #### ****** Parent ****** 
	{
		#### SET InactiveDestroy ON DATABASE HANDLE
		$self->db()->dbh()->{InactiveDestroy} = 1;
		my $dbh = $self->db()->dbh();
		undef $dbh;

		$self->logStatus("Running workflow $project.$workflow");
		print "\n\n\n\n";

		select STDOUT;
		$| = 1;
		close(STDOUT);
		exit(0);
	}
	else {
		$| = 1;
	
		#### CLOSE OUTPUT SO CGI SCRIPT WILL QUIT
		#close(STDOUT);  
		#close(STDERR);
		#close(STDIN);
	
		#### RESET DBH JUST IN CASE
		$self->setDbh();
		
		$self->logDebug("username", $username);
		$self->logDebug("project", $project);
		$self->logDebug("workflow", $workflow);
		$self->logDebug("cluster", $cluster);
	
		##### SET CLUSTER STATUS AS 'running' IN clusterworkflow AND clusterstatus
		my $starclusterobject;
		if ( defined $cluster and $cluster and $submit )
		{
			$self->updateClusterWorkflow($username, $cluster, $project, $workflow, 'running');
			$self->updateClusterStatus($username, $cluster, 'starting');
		
			#### CREATE CONFIG FILE IF MISSING
			my $configfile = $self->getConfigfile($username, $cluster);
			$self->_createConfigfile() if not -f $configfile;
		
			#### CREATE StarCluster OBJECT
			$self->logDebug("DOING starclusterobject = self->getStarClusterObject($username, $cluster)");
			$starclusterobject = $self->getStarClusterObject($username, $cluster);
			$self->logError("Agua::Workflow::executeWorkflow    starclusterobject not defined") if not defined $starclusterobject;
		
			#### START STARCLUSTER
			$self->logDebug("Starting StarCluster...\n");
			my $clusterstarted = $starclusterobject->start();
			$self->logDebug("clusterstarted", $clusterstarted);
			
			#### RESET DBH JUST IN CASE
			$self->setDbh();
		
			#### CHECK SGE IS RUNNING ON MASTER THEN HEADNODE
			$self->logDebug("DOING running = self->checkSge($username, $cluster)");
			my $sgerunning = $self->checkSge($username, $cluster);
			$self->logDebug("sgerunning", $sgerunning);
		
			my $status = "running";
			$status = "cluster error" if not $clusterstarted;
			$status = "SGE error" if not $sgerunning;
			
			$self->updateClusterStatus($username, $cluster, $status);
		
			#### CREATE A UNIQUE QUEUE FOR THIS WORKFLOW
			my $envars = $self->getEnvars($username, $cluster);
			$self->createQueue($project, $workflow, $username, $cluster, $envars);
		}
		
		#### SET STAGES
		$self->logDebug("BEFORE self->prepareStages");
		return if not $self->prepareStages($username, $cluster, $json, $project, $workflow);
		$self->logDebug("AFTER self->prepareStages");
		
		#### RUN STAGES
		$self->logDebug("BEFORE runStages()\n");
		$self->runStages();
		$self->logDebug("AFTER runStages()\n");
		
		#### END IF RUN LOCALLY
		$self->logDebug("Successfully completed local run") if not defined $cluster and not $cluster or not $submit;
		return if not defined $cluster or not $cluster or not $submit;
	
		#### UPDATE CLUSTER STATUS IF DEFINED
		$self->setClusterCompleted($username, $cluster, $project, $workflow) if defined $starclusterobject;
		
		#### RETURN IF OTHER WORKFLOWS ARE RUNNING
		my $cluster_busy = $self->clusterIsBusy($username, $cluster);
		$self->logDebug("cluster_busy", $cluster_busy);
		
		#### OTHERWISE, SET CLUSTER FOR TERMINATION 
		my $clusterobject = $self->getClusterStatus($username, $cluster);
		return if not defined $clusterobject;
		
		$clusterobject->{minnodes} = 0;
		$self->logDebug("clusterobject marked for termination, minnodes", $clusterobject->{minnodes});
	
		#### RESTART BALANCER	
		return if not defined $self->terminateBalancer($username, $cluster);
		$self->launchBalancer($clusterobject);
	
		$self->logGroupEnd("Agua::Workflow::executeWorkflow");
	}
}

method getStarClusterObject ($username, $cluster) {
#### RETURN INSTANCE OF StarCluster
	$self->logDebug("cluster", $cluster);
	
	#### RETURN IF NO CLUSTER DEFINED FOR THIS WORKFLOW
	return if not defined $cluster or not $cluster;
	
	#### RETURN IF EXISTS
	return $self->starcluster() if $self->starcluster();
	
	my $clusterobject = $self->getClusterStatus($username, $cluster);
	$clusterobject = $self->getCluster($username, $cluster) if not defined $clusterobject;
	#$self->logDebug("BEFORE clusterobject", $clusterobject);
	$self->logError("Agua::Workflow::getStarClusterObject    clusterobject not defined") if not defined $clusterobject;
	
	$clusterobject = $self->clusterInputs($clusterobject);
	$self->logDebug("clusterobject", $clusterobject);
	return if not defined $clusterobject;
	
	#### SET OUTPUT DIR
	my $outputdir = $self->getBalancerOutputdir($username, $cluster);
	$self->outputdir($outputdir);
	$clusterobject->{outputdir} = $outputdir;
	
	#### SET STARCLUSTER BINARY
	my $starclusterbinary = $self->conf()->getKey("applications:aquarius-8", "STARCLUSTER");
	$self->logDebug("starclusterbinary", $starclusterbinary);
	$clusterobject->{starcluster} = $starclusterbinary;

	#### SET LOG
	$clusterobject->{SHOWLOG} = $self->SHOWLOG();
	$clusterobject->{PRINTLOG} = $self->PRINTLOG();

	#### BALANCER OUTPUT FILE IS LOGFILE
	my $logfile = $self->getBalancerOutputfile($cluster);
	$self->logDebug("logfile", $logfile);
	$clusterobject->{logfile} = $logfile;

	#### GET ENVARS
	my $envars = $self->getEnvars($username, $cluster);
	$clusterobject->{envars} = $envars;

	#### SET JSON
	$clusterobject->{json} = $self->json();

	#### SET CLUSTER STARTUP WAIT TIME (SECONDS)
	$clusterobject->{tailwait} = 1200;
	
	#### INSTANTIATE STARCLUSTER OBJECT
	my $starcluster = Agua::StarCluster->new($clusterobject);
	$self->starcluster($starcluster);
	$self->logDebug("AFTER self->starcluster(starcluster)");

	return $starcluster;	
}
method prepareStages ($username, $cluster, $json, $project, $workflow) {
	$self->logGroup("Agua::Workflow::prepareStages");
	$self->logDebug("Agua::Workflow::prepareStages(username, cluster, json, project, workflow)");
	$self->logDebug("username", $username);
	$self->logDebug("cluster", $cluster);
	$self->logDebug("project", $project);
	$self->logDebug("workflow", $workflow);
	
	#### SET STAGES
	my $stages = $self->getStages($json);
	
	#### VERIFY THAT PREVIOUS STAGE HAS STATUS completed
	return 0 if not $self->checkPrevious($stages, $json);

	#### GET STAGE PARAMETERS FOR THESE STAGES
	$stages = $self->setStageParameters($stages, $json);

	#### SET START AND STOP
	my ($start, $stop) = $self->setStartStop($stages, $json);
	
	#### GET SETUID
	my $setuid = $self->json()->{setuid};
	$self->logDebug("setuid", $setuid) if defined $setuid;

	#### GET FILEROOT
	my $fileroot = $self->getFileroot($username);	
	
	#### SET FILE DIRS
	my ($scriptsdir, $stdoutdir, $stderrdir) = $self->setFileDirs($fileroot, $project, $workflow);
	$self->logDebug("scriptsdir", $scriptsdir);
	
	#### WORKFLOW PROCESS ID
	my $workflowpid = $self->workflowpid();

	#### CLUSTER, QUEUE AND QUEUE OPTIONS
	my $queue = $self->queueName($username, $project, $workflow);
	my $queue_options = $self->json()->{queue_options};
	
	#### SET OUTPUT DIR
	my $outputdir =  "$fileroot/$project/$workflow/";

	#### GET ENVIRONMENT VARIABLES
	my $envars = $self->getEnvars($username, $cluster);

	#### GET MONITOR
	$self->logDebug("BEFORE monitor = self->getMonitor()");
	my $monitor = $self->getMonitor();
	$self->logDebug("AFTER monitor = self->getMonitor()");

	#### LOAD STAGE OBJECT FOR EACH STAGE TO BE RUN
	my $stageobjects = [];    
	for ( my $counter = $start; $counter < $stop + 1; $counter++ ) {
		my $stage = $$stages[$counter];
		
		#### QUIT IF NO STAGE PARAMETERS
		$self->logError("stageparameters not defined for stage $stage->{name}") and exit if not defined $stage->{stageparameters};
		
		my $stage_number = $counter + 1;

		#### SET MONITOR
		$stage->{monitor} = $monitor;

		#### SET SGE ENVIRONMENT VARIABLES
		$stage->{envars} = $envars;
		
        #### SET SCRIPT, STDOUT AND STDERR FILES
		$stage->{scriptfile} 	=	"$scriptsdir/$stage->{number}-$stage->{name}.sh";
        $stage->{stdoutfile} 	=	"$stdoutdir/$stage->{number}-$stage->{name}.stdout";
        $stage->{stderrfile} 	= 	"$stderrdir/$stage->{number}-$stage->{name}.stderr";
		$stage->{cluster}		=  	$cluster;
		$stage->{workflowpid}	=	$workflowpid;
		$stage->{db}			=	$self->db();
		$stage->{conf}			=  	$self->conf();
		$stage->{fileroot}		=  	$fileroot;
		$stage->{queue}			=  	$queue;
		$stage->{queue_options}	=  	$queue_options;
		$stage->{outputdir}		=  	$outputdir;
		$stage->{setuid}		=  	$setuid;
		$stage->{qsub}			=  	$self->conf()->getKey("cluster", "QSUB");
		$stage->{qstat}			=  	$self->conf()->getKey("cluster", "QSTAT");
		$stage->{envars}		=  	$self->envars();

		#### ADD LOG INFO
		$stage->{SHOWLOG} 		=	$self->SHOWLOG();
		$stage->{PRINTLOG} 		=	$self->PRINTLOG();
		$stage->{logfile} 		=	$self->logfile();

		my $stageobject = Agua::Stage->new($stage);

		#### NEAT PRINT STAGE
		#$stageobject->toString();

		push @$stageobjects, $stageobject;
	}

	#### SET self->stages()
	$self->stages($stageobjects);
	$self->logDebug("final no. stageobjects", scalar(@$stageobjects));
	
	$self->logGroupEnd("Agua::Workflow::prepareStages");

}

method setFileDirs ($fileroot, $project, $workflow) {
	$self->logDebug("fileroot", $fileroot);
	$self->logDebug("project", $project);
	$self->logDebug("workflow", $workflow);
	my $scriptsdir = $self->createDir("$fileroot/$project/$workflow/scripts");
	my $stdoutdir = $self->createDir("$fileroot/$project/$workflow/stdout");
	my $stderrdir = $self->createDir("$fileroot/$project/$workflow/stdout");

	#### CREATE DIRS	
	File::Path::mkpath($scriptsdir) if not -d $scriptsdir;
	File::Path::mkpath($stdoutdir) if not -d $stdoutdir;
	File::Path::mkpath($stderrdir) if not -d $stderrdir;
	$self->logError("Cannot create directory scriptsdir: $scriptsdir") and exit if not -d $scriptsdir;
	$self->logError("Cannot create directory stdoutdir: $stdoutdir") and exit if not -d $stdoutdir;
	$self->logError("Cannot create directory stderrdir: $stderrdir") and exit if not -d $stderrdir;		

	return $scriptsdir, $stdoutdir, $stderrdir;
}

method runStages () {
    #### RUN STAGES 
	my $stages 	= 	$self->stages();
	$self->logDebug("no. stages", scalar(@$stages));

	for ( my $stage_counter = 0; $stage_counter < @$stages; $stage_counter++ )
	{
		my $stage = $$stages[$stage_counter];
		my $stage_number = $stage->number();
		my $stage_name = $stage->name();
		
		####  RUN STAGE
		$self->logDebug("Running stage $stage_number", $stage_name);
		my ($completed, $error) = $stage->run();
		$self->logDebug("completed", $completed);
		$self->logDebug("error", $error);
		$error = "" if not defined $error;
		$completed = "" if not defined $completed;
		$self->logDebug("Ended running stage $stage_counter", $completed);

		#### STOP IF THIS STAGE DIDN'T COMPLETE SUCCESSFULLY
		#### ALL APPLICATIONS MUST RETURN '0' FOR SUCCESS)
		if ( $completed eq "0" ) {
			$self->logDebug("Stage $stage_number: '$stage_name' completed successfully");
		}
		else {
            $self->logDebug("Setting status to 'error'");
            $stage->setStatus('error');
            $self->logDebug("After setting status");
			$self->logError("Stage $stage_number. $stage_name failed. code: $completed. error: $error");
			return 0;
		}
	}    
	
	return 1;
}


method createQueue ($project, $workflow, $username, $cluster, $envars) {
	$self->logCaller("");
	$self->logDebug("project", $project);
	$self->logDebug("workflow", $workflow);
	$self->logDebug("username", $username);
	$self->logDebug("cluster", $cluster);
	
	$self->logError("Agua::Workflow::createQueue    project not defined") if not defined $project;
	$self->logError("Agua::Workflow::createQueue    workflow not defined") if not defined $workflow;

	#### GET ENVIRONMENT VARIABLES FOR THIS CLUSTER/CELL
	my $json = $self->json();
	$self->logDebug("json", $json);
	
	#### SET STARCLUSTER ARGS	
	my $args = {};
	$args->{SHOWLOG} 	= $self->SHOWLOG();
	$args->{PRINTLOG} 	= $self->PRINTLOG();
	$args->{username}	= $username;
	$args->{cluster} 	= $cluster;
	$args->{project} 	= $project;
	$args->{workflow} 	= $workflow;
	$args->{qmasterport}= $envars->{qmasterport};
	$args->{execdport} 	= $envars->{execdport};
	$args->{sgecell} 	= $envars->{sgecell};
	$args->{sgeroot}	= $envars->{sgeroot};

	#### DETERMINE WHETHER TO USE ADMIN KEY FILES
	my $adminkey = $self->getAdminKey($username);
	$self->logDebug("adminkey", $adminkey);
	my $adminuser = $self->conf()->getKey("agua", "ADMINUSER");
	return if not defined $adminkey;
	$args->{configfile} =  $self->getConfigfile($username, $cluster) if not $adminkey;
	$args->{configfile} =  $self->getConfigfile($username, $cluster, $adminuser) if $adminkey;
	$self->logDebug("configfile", $args->{configfile});

	#### GET CLUSTER NODES INFO FROM cluster TABLE
	my $clusternodes = $self->getCluster($username, $cluster);
	$args->{nodetype} = $clusternodes->{instancetype};

	#### ADD CONF OBJECT	
	$args->{conf} = $self->conf();

	#### RENAME nodetype TO instancetype
	$args->{instancetype} = $args->{nodetype};

	#### CREATE THIS QUEUE IN SGE
	my $queue = $self->queueName($username, $project, $workflow);
	$args->{queue} = $queue;
	$self->logDebug("queue", $queue);

	$self->logDebug("DOING starcluster = Agua::StarCluster->new(args)");
	$self->logDebug("args", $args);
	my $starcluster = Agua::StarCluster->new($args);
	
	$self->logDebug("Doing StarCluster->setQueue($queue)\n");
	$starcluster->setQueue($queue);

	$self->logGroupEnd("Agua::Workflow::createQueue");
}

method deleteQueue ($project, $workflow, $username, $cluster, $envars) {
	$self->logDebug("Agua::Workflow::deleteQueue(project, workflow)");
	$self->logError("Agua::Workflow::deleteQueue    project not defined") if not defined $project;
	$self->logError("Agua::Workflow::deleteQueue    workflow not defined") if not defined $workflow;

	#### GET ENVIRONMENT VARIABLES FOR THIS CLUSTER/CELL
	my $args = $self->json();
	$args->{qmasterport} = $envars->{qmasterport};
	$args->{execdport} = $envars->{execdport};
	$args->{sgecell} = $envars->{sgecell};
	$args->{sgeroot} = $envars->{sgeroot};

	#### DETERMINE WHETHER TO USE ADMIN KEY FILES
	my $adminkey = $self->getAdminKey($username);
	$self->logDebug("adminkey", $adminkey);
	return if not defined $adminkey;
	my $adminuser = $self->conf()->getKey("agua", "ADMINUSER");
	$args->{configfile} =  $self->getConfigfile($username, $cluster) if not $adminkey;
	$args->{configfile} =  $self->getConfigfile($username, $cluster, $adminuser) if $adminkey;
	$self->logDebug("configfile", $args->{configfile});

	#### ADD CONF OBJECT	
	$args->{conf} = $self->conf();

	$self->logDebug("args", $args);
	
	#### RUN starcluster.pl TO GENERATE KEYPAIR FILE IN .starcluster DIR
	my $queue = $self->queueName($username, $project, $workflow);
	$self->logDebug("queue", $queue);
	my $starcluster = Agua::StarCluster->new($args);
	$self->logDebug("Doing StarCluster->unsetQueue($queue)");
	$starcluster->unsetQueue($queue);
}

method getMonitor () {
	return $self->monitor() if $self->monitor();
	my $clustertype =  $self->conf()->getKey('agua', 'CLUSTERTYPE');
	my $classfile = "Agua/Monitor/" . uc($clustertype) . ".pm";
	my $module = "Agua::Monitor::$clustertype";
	#$self->logDebug("BEFORE require $classfile");
	#require $classfile;
	#$self->logDebug("AFTER Doing require $classfile");

	my $monitor = $module->new(
		{
			pid			=>	$self->workflowpid(),
			conf 		=>	$self->conf(),
			db			=>	$self->db(),
			username	=>	$self->username(),
			project		=>	$self->project(),
			workflow	=>	$self->workflow(),
			cluster		=>	$self->cluster(),
			envars		=>	$self->envars(),
			logfile		=>	$self->logfile(),
			SHOWLOG		=>	$self->SHOWLOG(),
			PRINTLOG	=>	$self->PRINTLOG()
			
		}
	);

	$self->monitor($monitor);

	return $monitor;
}

method getWorkflowStages ($json) {
	$self->logDebug("Agua::Workflow::getWorkflowStages(json)");
    
	my $username = $json->{username};
    my $project = $json->{project};
    my $workflow = $json->{workflow};

	#### CHECK INPUTS
    $self->logError("Agua::Workflow::getWorkflowStages    username not defined") if not defined $username;
    $self->logError("Agua::Workflow::getWorkflowStages    project not defined") if not defined $project;
    $self->logError("Agua::Workflow::getWorkflowStages    workflow not defined") if not defined $workflow;

	#### GET ALL STAGES FOR THIS WORKFLOW
    my $query = qq{SELECT * FROM stage
WHERE username ='$username'
AND project = '$project'
AND workflow = '$workflow'
ORDER BY number};
    $self->logDebug("$query");
    my $stages = $self->db()->queryhasharray($query);
	$self->logError("stages not defined for username: $username") and return if not defined $stages;	

	$self->logDebug("stages:");
	foreach my $stage ( @$stages )
	{
		my $stage_number = $stage->number();
		my $stage_name = $stage->name();
		my $stage_submit = $stage->submit();
		print "Agua::Workflow::runStages    stage $stage_number: $stage_name [submit: $stage_submit]";
	}

	return $stages;
}

method checkPrevious ($stages, $json) {
	#### IF NOT STARTING AT BEGINNING, CHECK IF PREVIOUS STAGE COMPLETED SUCCESSFULLY
	
	my $start = $json->{start};
    $start--;	
	$self->logDebug("start", $start);
	return 1 if $start == 0;

	my $stage_number = $start - 1;
	$$stages[$stage_number]->{appname} = $$stages[$stage_number]->{name};
	$$stages[$stage_number]->{appnumber} = $$stages[$stage_number]->{number};
	my $keys = ["username", "project", "workflow", "name", "number"];
	my $where = $self->db()->where($$stages[$stage_number], $keys);
	my $query = qq{SELECT status FROM stage $where};
	my $status = $self->db()->query($query);
	
	return 1 if not defined $status or not $status;
	$self->logError("previous stage not completed: $stage_number") and return 0 if $status ne "completed";
	return 1;
}

method setStageParameters ($stages, $json) {
	#### GET THE PARAMETERS FOR THE STAGES WE WANT TO RUN
	$self->logDebug("Agua::Workflow::setStageParameters(stages, json)");
	#### GET THE PARAMETERS FOR THE STAGES WE WANT TO RUN
	my $start = $json->{start};
    $start--;
	for ( my $i = $start; $i < @$stages; $i++ )
	{
		$$stages[$i]->{appname} = $$stages[$i]->{name};
		$$stages[$i]->{appnumber} = $$stages[$i]->{number};
		my $keys = ["username", "project", "workflow", "appname", "appnumber"];
		my $where = $self->db()->where($$stages[$i], $keys);
		my $query = qq{SELECT * FROM stageparameter
$where AND paramtype='input'};
		my $stageparameters = $self->db()->queryhasharray($query);
		$$stages[$i]->{stageparameters} = $stageparameters;
	}
	
	return $stages;
}

method setStartStop ($stages, $json) {
	$self->logDebug("Agua::Workflow::setStartStop(stages, json)");
	$self->logDebug("No. stages: " . scalar(@$stages));

	$self->logError("stages is empty") and return if not scalar(@$stages);
	$self->logError("json->{start} not defined") and return if not defined $json->{start};
	$self->logError("start is non-numeric: $json->{start}") and return if $json->{start} !~ /^\d+$/;

	my $start = $json->{start} - 1;
	$self->logError("Runner starting stage $start is greater than the number of stages") and return if $start > @$stages;

	my $stop;
	$stop = $json->{stop} - 1 if defined $json->{stop};
	if ( defined $stop and $stop ne '' ) {
		$self->logError("stop is non-numeric: $stop") and return if $stop !~ /^\d+$/;
		$self->logError("Runner stoping stage $stop is greater than the number of stages") and return if $stop > @$stages;
	}
	else {
		$stop = scalar(@$stages) - 1;
	}
	
	if ( $start > $stop ) {
		$self->logError("start ($start) is greater than stop ($stop)");
	}

	$self->logDebug("Setting start: $start");	
	$self->logDebug("Setting stop: $stop");	
	
	$self->start($start);
	$self->stop($stop);
	
	return ($start, $stop);
}

#### STOP WORKFLOW
method stopWorkflow {
    $self->logDebug("()    Agua::Workflow::stopWorkflow()");
    
        my $json         =	$self->json();

	#### SET EXECUTE WORKFLOW COMMAND
    my $bindir = $self->conf()->getKey("agua", 'INSTALLDIR') . "/cgi-bin";

    my $username = $json->{username};
    my $project = $json->{project};
    my $workflow = $json->{workflow};
	my $cluster = $json->{cluster};
	my $start = $json->{start};
    $start--;
    $self->logDebug("project", $project);
    $self->logDebug("start", $start);
    $self->logDebug("workflow", $workflow);
    
	#### GET ALL STAGES FOR THIS WORKFLOW
    my $query = qq{SELECT * FROM stage
WHERE username ='$username'
AND project = '$project'
AND workflow = '$workflow'
AND status='running'
ORDER BY number};
	$self->logDebug("$query");
	my $stages = $self->db()->queryhasharray($query);
	$self->logDebug("stages", $stages);

	#### EXIT IF NO PIDS
	$self->logError("No running stages in $project.$workflow") and return if not defined $stages;

	#### WARNING IF MORE THAN ONE STAGE RETURNED (SHOULD NOT HAPPEN 
	#### AS STAGES ARE EXECUTED CONSECUTIVELY)
	$self->logError("More than one running stage in $project.$workflow. Continuing with stopWorkflow") if scalar(@$stages) > 1;

	my $submit = $$stages[0]->{submit};
	$self->logDebug("submit", $submit);

	my $messages;
	if ( defined $submit and $submit )
	{
		$self->logDebug("Doing killClusterJob(stages)");
		$messages = $self->killClusterJob($project, $workflow, $username, $cluster, $stages);
	}
	else
	{
		$self->logDebug("Doing killLocalJob(stages)");
		$messages = $self->killLocalJob($stages);
	}
	
	#### SET THIS STAGE STATUS AS 'stopped'
	my $update_query = qq{UPDATE stage
SET status = 'stopped'
WHERE username ='$username'
AND project = '$project'
AND workflow = '$workflow'
AND status='running'
};
	$self->logDebug("$update_query\n");
	my $success = $self->db()->do($update_query);
	$self->logError("Could not update stages for $project.$workflow") and exit if not $success;
	$self->logStatus("Updated stages for $project.$workflow");
}


method killClusterJob ($project, $workflow, $username, $cluster, $stages) {
=head2

	SUBROUTINE		killClusterJob
	
	PURPOSE
	
		1. CANCEL THE JOB IDS OF ANY RUNNING STAGE OF THE WORKFLOW:
		
			1. IN THE CASE OF A SINGLE JOB, CANCEL THAT JOB ID
			
			2. IF AN APPLICATION IS RUNNING LOCALLY AND SUBMITTING JOBS TO THE
			
			CLUSTER, KILL ITS PROCESS ID AND CANCEL ANY JOBS IT HAS SUBMITTED
			
			(SHOULD BE REGISTERED IN THE stagejobs TABLE)

=cut
    $self->logDebug("Agua::Workflow::killClusterJob(stages)");
    
    $self->logDebug("stages", $stages);

        my $json         =	$self->json();
	
	foreach my $stage ( @$stages )
	{
		#### KILL PROCESS THAT SUBMITTED JOBS TO CLUSTER
		$self->killPid($stage->{workflowpid});
		#$self->killPid($stage->{stagepid});
	}

	#### DELETE THE QUEUE CONTAINING ALL JOBS FOR THIS WORKFLOW
	my $envars = $self->getEnvars($username, $cluster);
	$self->deleteQueue($project, $workflow, $username, $cluster, $envars);
}



method cancelJob ($jobid) {
=head2

	SUBROUTINE		cancelJob
	
	PURPOSE
	
		CANCEL A CLUSTER JOB BY JOB ID
		
=cut
	$self->logDebug("Agua::Workflow::cancelJob(jobid)");
	my $canceljob = $self->conf()->getKey("cluster", 'CANCELJOB');
	$self->logDebug("jobid", $jobid);
	
	my $command = "$canceljob $jobid";

	return `$command`;
}

method killLocalJob ($stages) {
=head2

	SUBROUTINE		killLocalJob
	
	PURPOSE
	
		1. 'kill -9' THE PROCESS IDS OF ANY RUNNING STAGE OF THE WORKFLOW
		
		2. INCLUDES STAGE PID, App PARENT PID AND App CHILD PID)
=cut
    $self->logDebug("Agua::Workflow::killLocalJob(stages)");
	my $messages = [];
	foreach my $stage ( @$stages )
	{
		#### OTHERWISE, KILL ALL PIDS
		push @$messages, $self->killPid($stage->{childpid}) if defined $stage->{childpid};
		push @$messages, $self->killPid($stage->{parentpid}) if defined $stage->{parentpid};
		push @$messages, $self->killPid($stage->{stagepid}) if defined $stage->{stagepid};
		push @$messages, $self->killPid($stage->{workflowpid}) if defined $stage->{workflowpid};
	}

	return $messages;
}

method killPid ($pid) {
=head2

	SUBROUTINE		killPid
	
	PURPOSE
	
		KILL THE PROCESS AND RETURN THE RESULT

=cut
	my $kill_command = "kill -9 $pid";
	$self->logDebug("kill command", $kill_command);
	`$kill_command >nul 2>&1`;
	
	return $kill_command;
}

method workflowStatus ($workflow_number) {
=head2

	SUBROUTINE		workflow
	
	PURPOSE
	
		RETURN THE STATUS FOR THE DESIGNATED STAGE OF A WORKFLOW
		
=cut

    my $dbh	    =	$self->dbh();
	
	my $query = qq{SELECT status FROM stage
	WHERE workflownumber='$workflow_number'
	LIMIT 1};
	my $workflowStatus = Database::simple_query($dbh, $query);
	
	return $workflowStatus;
}



method workflows {
=head2

	SUBROUTINE		workflows
	
	PURPOSE
	
		RETURN A REFERENCE TO THE HASHARRAY OF WORKFLOW NUMBER AND NAMES
        
        IN THE collectionworkflow TABLE OF THE myEST DATABASE
		
=cut

    my $dbh     = $self->dbh();
	my $query = qq{SELECT DISTINCT project, workflownumber, workflow, number, name
    FROM stage ORDER BY workflownumber, number};
	my $workflows = Database::simple_queryhasharray($dbh, $query);
	
	return $workflows;
}


#### GET STATUS
method getStatus () {
#### 1. GET STAGES STATUS FROM stage TABLE
#### 2. GET CLUSTER STATUS IF CLUSTER IS RUNNING
#### 3. USER'S PROJECT WORKFLOW QUEUE STATUS IF CLUSTER IS RUNNING
#### 4. UPDATE stage TABLE WITH JOB STATUS FROM QSTAT IF CLUSTER IS RUNNING
#### 5. RETURN VALUES FROM 1, 2 AND 3 IN A HASH

    $self->logDebug("");
	
    my $username	= 	$self->username();
    my $project 	= 	$self->project();
    my $workflow 	= 	$self->workflow();
    my $json  		=	$self->json();
    my $start 		= 	$json->{start};
    $self->logDebug("project", $project);
    $self->logDebug("workflow", $workflow);

	#### 1. GET STAGES STATUS FROM stage TABLE
    my $query = qq{SELECT *, NOW() AS now
FROM stage
WHERE username ='$username'
AND project = '$project'
AND workflow = '$workflow'
ORDER BY number
};
	$self->logDebug("query", $query);
    my $stages = $self->db()->queryhasharray($query);
	$self->logDebug("stages", $stages);
	$self->logError("No stages with run status for username: $username, project: $project, workflow: $workflow from start: $start") and exit if not defined $stages;

	#### RETRIEVE CLUSTER INFO FROM clusterworkflow TABLE
	my $cluster = $self->getClusterByWorkflow($username, $project, $workflow);
	$cluster = "" if not defined $cluster;
	$self->cluster($cluster) if defined $cluster;

    #### IF CLUSTER IS NOT DEFINED THEN JOB WAS SUBMITTED LOCALLY 
	#### AND THE stage TABLE SHOULD BE UPDATED BY THE PROCESS ON EXIT.
	#### SO JUST PRINT stages AND QUIT
	if ( not $cluster ) {
		$self->logDebug("cluster not defined. Printing stages and returning");
		require JSON;
		my $jsonObject = JSON->new();
		my $statusJson = $jsonObject->encode({
			stagestatus 	=> 	$stages,
			clusterstatus	=>	{},
			queuestatus		=>	{}
		});
		$statusJson =~ s/"/'/g;    
		print $statusJson;
		return;    
	}

	#### CHECK IF CLUSTER IS RUNNING
	my $configfile = $self->getConfigfile($username, $cluster);
	my $datavolume = $self->conf()->getKey('bioapps', 'DATAVOLUME');
	$self->logDebug("datavolume", $datavolume);
	my $starcluster = $self->conf()->getKey("applications:$datavolume", "STARCLUSTER");
	$self->logDebug("starcluster", $starcluster);
	my $cluster_running = $self->clusterIsRunning($cluster, $configfile, $starcluster);

	#### IF CLUSTER IS RUNNING, GET CLUSTER STATUS AND QUEUE STATUS
	my $clusterstatus = "NO CLUSTER RUNNING";
	my $queuestatus = "NO QUEUES RUNNING";
	if ( $cluster_running ) {
		#### RESTART SGE IF NOT RUNNING
		$self->checkSge($username, $cluster);
	
		#### 2. GET CLUSTER STATUS
		$clusterstatus = $self->clusterOutput();
		$self->logDebug("clusterstatus", $clusterstatus);
	
		#### 3. GET qstat QUEUE STATUS FOR THIS USER'S PROJECT WORKFLOW
		my $monitor = $self->getMonitor();
		my $queuestatus = $monitor->queueStatus();
	
		#### 4. UPDATE stage TABLE WITH JOB STATUS FROM QSTAT
		$self->updateStageStatus($monitor, $stages);	
	}
	
	my $status;
	$status->{stagestatus} 		= $stages;
	$status->{clusterstatus} 	= $clusterstatus;
	$status->{queuestatus} 		= $queuestatus;

    require JSON;
    my $jsonObject = JSON->new();
    my $statusJson = $jsonObject->encode($status);
    print $statusJson;
}

method updateStageStatus($monitor, $stages) {
#### UPDATE stage TABLE WITH JOB STATUS FROM QSTAT
	my $statusHash = $monitor->statusHash();
	$self->logDebug("statusHash", $statusHash);	
	foreach my $stage ( @$stages )
	{
		my $stagejobid = $stage->{stagejobid};
		next if not defined $stagejobid or not $stagejobid;
		$self->logDebug("pid", $stagejobid);

		#### GET STATUS
		my $status;
		if ( defined $statusHash )
		{
			$status = $statusHash->{$stagejobid};
			next if not defined $status;
			$self->logDebug("status", $status);

			#### SET TIME ENTRY TO BE UPDATED
			my $datetime = "queued";
			$datetime = "started" if defined $status and $status eq "running";

			$datetime = "completed" if not defined $status;
			$status = "completed" if not defined $status;
		
			#### UPDATE THE STAGE ENTRY IF THE STATUS HAS CHANGED
			if ( $status ne $stage->{status} )
			{
				my $query = qq{UPDATE stage
SET status='$status',
$datetime=NOW()
WHERE username ='$stage->{username}'
AND project = '$stage->{project}'
AND workflow = '$stage->{workflow}'
AND number='$stage->{number}'};
				$self->logDebug("$query");
				my $result = $self->db()->do($query);
				$self->logDebug("status update result", $result);
			}
		}
	}	
}

method clusterOutput () {
	$self->logDebug("Agua::Workflow::clusterOutput()");
	my $username = $self->username();
	my $cluster = $self->cluster();
	$self->logError("Agua::Workflow::clusterOutput    cluster not defined") if not $cluster;

	#### SET OUTPUT DIR IF NOT DEFINED
	if ( not $self->outputdir() )
	{
		my $outputdir = $self->getBalancerOutputdir($username, $cluster);
		$self->logDebug("outputdir: " . $outputdir);
		$self->outputdir($outputdir);
	}

	my $clusterlines = 20;
	my $clusterlog = $self->balancerOutput($cluster, $clusterlines);
	
	#### GET CLUSTER LIST
	my $configfile	=	$self->getConfigfile($username, $cluster);
	my $command = "starcluster -c $configfile listclusters $cluster";
	$self->logDebug("command", $command);
	my ($clusterlist) = $self->head()->ops()->runCommand($command);
	my $status = "unknown";
	if ( $clusterlist =~ /Cluster nodes:\s+master\s+(\S+)/ ) {
		$status = $1;
	}
	
	my $clusterstatus = {
		cluster			=>	$cluster,
		status			=>	$status,
		clusterLog		=>	$clusterlog,
		clusterList		=>	$clusterlist
	};
	
	return $clusterstatus;
}

method setClusterCompleted ($username, $cluster, $project, $workflow) {

	#### CHANGE STATUS IN clusterworkflow 
	$self->updateClusterWorkflow($username, $cluster, $project, $workflow, 'completed');

	#### SHUT DOWN StarCluster IF NOT IN USE BY OTHER WORKFLOWS
	if ( not $self->clusterIsBusy($username, $cluster) )
	{
	 	$self->logDebug("cluster is not busy. Doing starcluster->stop()");
		#$starcluster->stop();	
		$self->updateClusterStatus($username, $cluster, 'completed');
	}
}

method updateClusterWorkflow ($username, $cluster, $project, $workflow, $status) {
 	$self->logDebug("Agua::StarCluster::updateClusterWorkflow(username, cluster, project, workflow)");

	#### CHANGE STATUS TO COMPLETED IN clusterworkflow TABLE
	my $query = qq{UPDATE clusterworkflow
SET status='$status'
WHERE username='$username'
AND cluster='$cluster'
AND project='$project'
AND workflow='$workflow'};
	my $success = $self->db()->do($query);
	return 1 if defined $success and $success;
	return 0;
}

method updateClusterStatus ($username, $cluster, $status) {
 	$self->logDebug("Agua::StarCluster::updateClusterStatus(username, cluster, project, workflow)");

	#### CHANGE STATUS TO COMPLETED IN clusterstatus TABLE
	my $query = qq{UPDATE clusterstatus
SET status='$status'
WHERE username='$username'
AND cluster='$cluster'};
	my $success = $self->db()->do($query);
	return 1 if defined $success and $success;
	return 0;
}

method startBalancer ($clusterobject) {
    $self->logDebug("Workflow::startBalancer(clusterobject)");
    $self->logDebug("clusterobject", $clusterobject);
	
	my $starcluster = $self->getStarClusterObject();
	$starcluster->launchBalancer();
}

#### STOP CLUSTER
method stopCluster () {
	$self->logDebug("Agua::Workflow::stopCluster()");

    my $json         =	$self->json();
	my $username 	=	$json->{username};
	my $cluster 	=	$json->{cluster};

	$self->logDebug("cluster", $json->{cluster});
	$self->logDebug("username", $json->{username});

	$self->logDebug("Doing starcluster = StarCluster->new(json)");
	my $starcluster = $self->getStarClusterObject($username, $cluster);

	$self->logError("Cluster $cluster is not running: $cluster") and return if not $starcluster->clusterIsRunning();
	

	$self->logDebug("Doing StarCluster->stop()");
	$starcluster->stop();
}


}

1;

