package Agua::Common::Package::Upgrade;
use Moose::Role;
use Method::Signatures::Simple;

#### UPGRADE
method upgrade {
#### INSTALL NEWER OR LATEST VERSION OF A PACKAGE
	
	my 	$username 		= $self->username();
	my 	$sessionid 		= $self->sessionId();
	my 	$version 		= $self->version();
	my  $package 		= $self->package();
	my  $hubtype 		= $self->hubtype();
	my 	$owner 			= $self->owner();
	my 	$privacy 		= $self->privacy();
	my  $repository 	= $self->repository();
	my  $random 		= $self->random();
	my  $opsrepo 		= $self->opsrepo();
	my  $opsdir 		= $self->opsdir();

	$self->logError("owner not defined") and exit if not defined $owner;
	$self->logError("package not defined") and exit if not defined $package;
	$self->logError("username not defined") and exit if not defined $username;
	$self->logError("hubtype not defined") and exit if not defined $hubtype;
	$self->logError("repository not defined") and exit if not defined $repository;
	
	$self->logDebug("owner", $owner);
	$self->logDebug("privacy", $privacy);
	$self->logDebug("version", $version);
	$self->logDebug("package", $package);
	$self->logDebug("username", $username);
	$self->logDebug("hubtype", $hubtype);
	$self->logDebug("repository", $repository);
	$self->logDebug("random", $random);

	######### CREATE REPO IF NOT PRESENT
	#####$self->logDebug("Checking if repo is present");
	#####$self->checkRepo($username, $repository);

	#### SET OPS DIRECTORY (CONTAINS *.ops FILE)
	$opsrepo = $self->conf()->getKey("agua", "OPSREPO") if not $opsrepo;
	$self->logDebug("opsrepo", $opsrepo);
	
	#### SET OPSDIR
	$opsdir = $self->setOpsDir($owner, $opsrepo, $privacy, $package) if not $opsdir;
	$self->logDebug("opsdir", $opsdir);
	
	#### SET INSTALLDIR
	my $installdir = $self->setInstallDir($username, $owner, $package, $privacy);
	$self->logDebug("installdir not defined")  if not defined $installdir;
	$self->logDebug("installdir", $installdir);

	#### SET TO ALTERNATE INSTALLDIR IF DEFINED
	$installdir = $self->installdir() if defined $self->installdir();
	$self->logDebug("installdir", $installdir);

	#### GET CURRENTLY INSTALLED VERSION AND INSTALLATION DIRECTORY
	my $packageobject = $self->getPackage($username, $package);
	my $oldversion = 	$packageobject->{version};
	$self->logDebug("packageobject", $packageobject);
	
	$self->logDebug("oldversion not defined")  if not defined $oldversion;
	$self->logDebug("oldversion", $oldversion) if defined $oldversion;

	#### GET LOGIN AND TOKEN FOR USER IF STORED IN DATABASE
	my ($login, $token) = $self->setLoginCredentials($username, $hubtype, $privacy);
	
	#### GET SSH KEYFILE IF AVAILABLE
	my $keyfile = $self->setKeyfile($username, $hubtype);
	$self->logDebug("upgrade    keyfile", $keyfile);
	$self->logDebug("upgrade    repository", $repository);
	$self->logDebug("upgrade    owner", $owner);
	$self->logDebug("upgrade    package", $package);
	#$self->logDebug("upgrade    self->db()", $self->db());
	
	$self->logDebug("DOING ops = Agua::Ops->new()");

	my $sleep = 10;
	sleep($sleep);
	$self->logDebug("AFTER SLEEP $sleep");
	
	#### CREATE OPS INSTANCE
	my $ops = Agua::Ops->new({
		owner		=>	$owner,
		username	=>	$username,
		sessionId	=>	$sessionid,
		repository	=>	$repository,
		package		=>	$repository,
		installdir	=>	$installdir,
		privacy		=>	$privacy,
		opsdir		=>	$opsdir,
		random		=>	$random,
		version		=>	$version,
		login		=>	$login,
		token		=>	$token,
		keyfile		=>	$keyfile,
		owner		=>	$owner,
		conf		=>	$self->conf(),
		db			=>	$self->db(),
		SHOWLOG		=>	$self->SHOWLOG(),
		PRINTLOG	=>	$self->PRINTLOG(),
		showreport	=>	0,
		logfile		=>	$self->logfile()
	});
	
	my ($log) = $ops->install();
	$self->logDebug("log", $log);
	return if not defined $log;
	
	my $newversion = $self->parseOpsOut($log);
	$self->version($newversion) if defined $newversion;	
}

method parseOpsOut ($output) {
	#$self->logDebug("output", $output);
	my ($version) = $output =~ /version: (\S+)/;
	$self->logError("parseOpsOut    version is null") and exit if not defined $version;
	return $version;
}

method checkRepo ($username, $repository, $private) {
	my $repoobject = $self->head()->ops()->getRepo($username, $repository);
	$self->logDebug("repoobject", $repoobject);
	$self->logDebug("private", $private) if defined $private;
	$self->logDebug("private not defined") if not defined $private;

	if ( not defined $repoobject ) {
		$self->logDebug("Doing createRepo.");
		if ( $private ) {
			my $description = "$username's public repository";
			$self->head()->ops()->createPrivateRepo($username, $repository, $description);
		}
		else {
			my $description = "$username's private repository";
			$self->head()->ops()->createPublicRepo($username, $repository, $description);
		}
	}
}

method addRepo ($username, $repository, $private) {
	my $repoobject = $self->head()->ops()->getRepo($username, $repository);
	$self->logDebug("repoobject", $repoobject);
	$self->logDebug("repoobject->{private}: " . $repoobject->{private});

	if ( not defined $repoobject )
	{
		$self->logDebug("Doing createRepo.");
		my $description = undef;
		if ( $private ) {
			$self->head()->ops()->createPrivateRepo($username, $repository, $description);
		}
		else {
			$self->head()->ops()->createPublicRepo($username, $repository, $description);
		}
	}
}

method upgradeAgua {
	$self->logDebug("");
	
	#### SET VARIABLES
	$self->owner("agua");
	$self->repository("agua");
	$self->package("agua");
	$self->hubtype("github");
	$self->branch("master");
	$self->private(0);
	$self->installdir($self->conf()->getKey("agua", "INSTALLDIR"));

	#### DO UPGRADE
	$self->upgrade();	
}


1;
