#!/usr/bin/perl

use FCGI; # Imports the library; required line

# Initialization code

$cnt = 0;

#### USE LIBS
use FindBin qw($Bin);
use lib "$Bin/lib";
use lib "/agua/lib";
use lib "/agua/lib";

#### INTERNAL MODULES
use Agua::Workflow;
use Agua::DBaseFactory;
use Conf::Agua;

#### EXTERNAL MODULES
use DBI;
use DBD::SQLite;
use Data::Dumper;

#### TIME BEFORE    
use Devel::Peek;
use Time::HiRes qw[gettimeofday tv_interval];
my $time = [gettimeofday()];	

#### SET LOG
my $SHOWLOG     =   2;
my $PRINTLOG    =   4;

#### GET CONF
my $conf = Conf::Agua->new(
	inputfile	=>	"$Bin/conf/default.conf",
	backup		=>	1,
    SHOWLOG     =>  2,
    PRINTLOG    =>  4
);

my $object = Agua::Workflow->new({
    conf        =>  $conf,
    #SHOWLOG     =>  4,
    SHOWLOG     =>  $SHOWLOG,
    PRINTLOG    =>  $PRINTLOG
});


# Response loop
while (FCGI::accept >= 0) {

my $begintime = time();

print "Content-type: text/html\r\n\r\n";

$| = 1;

$cnt++;
warn "This is connection number $cnt\n";
my $whoami = `whoami`;
chomp($whoami);
warn "whoami: $whoami<br>\n";

### GET PUTDATA
my $input	= <STDIN>;
##my $input	= $ARGV[0];

print "{ error: 'workflow.pl    input not defined' }" and exit if not defined $input or not $input or $input =~ /^\s*$/;

#### GET JSON
use JSON;
my $jsonParser = JSON->new();
my $json = $jsonParser->allow_nonref->decode($input);
print "{ 'error' : 'workflow.pl   JSON not defined' }" and exit if not defined $json;

warn "JSON Parser: ", tv_interval($time), "\n";


#### GET MODE
my $mode = $json->{mode};
warn "mode: $mode\n";
print "{ error: 'workflow.pl    mode not defined' }" and exit if not defined $mode;

#### GET USERNAME
my $username = $json->{username};
print "{ error: 'view.cgi    username not defined' }" and exit if not defined $username;

warn "Instantiate Conf::Agua: ", tv_interval($time), "\n";

my $logfile     =   "$Bin/log/$username.workflow.log";
$conf->logfile($logfile);
$object->logfile($logfile);
$object->initialise($json);


warn "Instantiate Agua::Workflow: ", tv_interval($time), "\n";

print "{ error: 'mode not supported: $mode' }" and exit if not $object->can($mode);

#### RUN QUERY
no strict;
$object->$mode();
use strict;



warn "workflow->$mode(): ", tv_interval($time), "\n";

my $endtime = time();
warn "total: " . ($endtime - $begintime) . "\n";

EXITLABEL: { warn "Doing EXITLABEL\n"; };



}   # while (FCGI::accept >= 0) {









