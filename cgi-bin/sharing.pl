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
use Agua::Sharing;
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
my $PRINTLOG    =   5;

#### GET CONF
my $conf = Conf::Agua->new(
	inputfile	=>	"$Bin/conf/default.conf",
	backup		=>	1,
    SHOWLOG     =>  2,
    PRINTLOG    =>  4
);

my $object = Agua::Sharing->new({
    conf        =>  $conf,
    #SHOWLOG     =>  4,
    SHOWLOG     =>  $SHOWLOG,
    PRINTLOG    =>  $PRINTLOG
});

use JSON;
my $jsonParser = JSON->new();

# Response loop
while (FCGI::accept >= 0) {

my $begintime = time();

print "Content-type: text/html\r\n\r\n";
$cnt++;
warn "This is connection number $cnt\n";
my $whoami = `whoami`;
chomp($whoami);
warn " XXX: $whoami<br>\n";

### GET PUTDATA
my $input	= <STDIN>;
print "{ error: 'sharing.pl    input not defined' }" and exit if not defined $input or not $input or $input =~ /^\s*$/;

#### GET JSON
my $json = $jsonParser->allow_nonref->decode($input);
print "{ 'error' : 'sharing.pl   JSON not defined' }" and exit if not defined $json;

warn "JSON parsed: ", tv_interval($time), "\n";

#### GET MODE
my $mode = $json->{mode};
print "{ error: 'sharing.pl    mode not defined' }" and exit if not defined $mode;

#### GET USERNAME
my $username = $json->{username};
print "{ error: 'sharing.pl    username not defined' }" and exit if not defined $username;

#### SET LOGFILE
my $logfile     =   "$Bin/log/$username.sharing.log";
$conf->logfile($logfile);
$object->logfile($logfile);

#### INITIALISE OBJECT
$object->initialise($json);

#### RUN COMMAND
no strict;
$object->$mode();
use strict;
warn "sharing->$mode(): ", tv_interval($time), "\n";

my $endtime = time();
warn "total: " . ($endtime - $begintime) . "\n";

EXITLABEL: { warn "Doing EXITLABEL\n"; };

}   # while (FCGI::accept >= 0) {









