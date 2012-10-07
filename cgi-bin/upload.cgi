#!/usr/bin/perl -w

#### DEBUG
my $DEBUG = 0;
$DEBUG = 1;

=head2

	APPLICATION 	upload.cgi
	
	PURPOSE
	
		1. SAVE FILE CONTENTS TO TEMPORARY FILE
		
		2. USE SETUID TO EXECUTE RELAY TO TRANSFER FILE TO USER'S
		
			DIRECTORY
		
	USAGE

		./upload.cgi < transfer-data-in-mime-format.txt

	NOTES
	
		TEMP UPLOAD DIR MUST HAVE THE FOLLOWING PERMISSIONS:

		chmod 0777 uploads

=cut

use strict;

#### PRINT HEADER FOR DEBUGGING ONLY
print "Content-type: text/html\n\n";

#### EXTERNAL MODULES
use FindBin qw($Bin);
use File::Copy;

#### USE LIBS
use lib "$Bin/lib";

#### INTERNAL MODULES
use Agua::Upload;

#### SET LOG
my $SHOWLOG     = 2;
my $PRINTLOG    = 5;

my $logfile     = "/tmp/agua-upload.log";

#### GET CONF
use Conf::Agua;
my $conf = Conf::Agua->new(
	inputfile	=>	"$Bin/conf/default.conf",
	backup		=>	1,
    logfile     =>  $logfile,
    SHOWLOG     =>  $SHOWLOG,
    PRINTLOG    =>  $PRINTLOG    
);


my $uploader = Agua::Upload ->new({
	conf	=>	$conf,
    logfile     =>  $logfile,
    SHOWLOG     =>  $SHOWLOG,
    PRINTLOG    =>  $PRINTLOG    
});
$uploader->upload();

#exit(0);


####################################################################
#####################           SUBROUTINES      ###################
####################################################################

