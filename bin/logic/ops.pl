#!/usr/bin/perl -w

#### DEBUG
my $DEBUG = 0;
#$DEBUG = 1;

=head2

APPLICATION

    ops

PURPOSE

    Run system commands and other operations by calling subroutines
    
    in a dynamically loaded perl module (default: 'ops.pm') which
    
    automatically inherts from Ops.pm

USAGE

    ./ops.pl subroutine [options] [args] [--help]


module   :    Location of module file (default: ./ops.pm)
options  :    Keys or key:value pairs for slots in the dynamic class
args     :    AList of arguments for the selected subroutine
--help   :    print help info

EXAMPLES

#### install fastq
./ops.pl fastq install --keyfile /nethome/admin/.starcluster/id_rsa-admin-key --hosts ec2-184-73-22-214.compute-1.amazonaws.com --user root


#### NB: YOU CAN MIX UP OPTIONS AND ARGUMENTS:

./ops.pl --keyfile /nethome/admin/.starcluster/id_rsa-admin-key --hosts ec2-184-73-22-214.compute-1.amazonaws.com --user root fastq install 


#### ... BUT FLAGS MUST BE PLACED AT THE END OF THE LIST OF ARGUMENTS AND OPTIONS

./ops.pl --keyfile /nethome/admin/.starcluster/id_rsa-admin-key --hosts ec2-184-73-22-214.compute-1.amazonaws.com --user root fastq install --warn

=cut

#### TIME
my $time = time();
my $duration = 0;
my $current_time = $time;

use strict;
#use diagnostics;

#### DISABLE BUFFERING OF STDOUT
$| = 1;

#### USE LIB
use FindBin qw($Bin);
use lib "$Bin/../../lib";

#### INTERNAL MODULES
use Conf::Agua;
use Agua::DBaseFactory;
use Agua::Ops;

#### EXTERNAL MODULES
use Getopt::Long;
use JSON;

sub getopts {
#### EXTRACT '--option' OPTIONS FROM @ARGV LEAVING ONLY ARGUMENTS FOR SUBROUTINE
    my $options = {};
    for ( my $i = 0; $i < $#ARGV + 1; $i++ )
    {
        if ( $ARGV[$i] =~ /^--/ ){
            if ( $i < $#ARGV and $ARGV[$i + 1] !~ /^--/ )
            {
                my ($key) = $ARGV[$i] =~ /^--(.+)$/;
                $options->{$key} = $ARGV[$i + 1];
                splice @ARGV, $i, 2;
                $i=-2;
            }
            else {
                $options->{$ARGV[$i]} = 1;
                splice @ARGV, $i, 1;
                $i--;
            }
        }
    }

    print "No ops file specified (e.g., 'myapp' specifies file myapp.pm)\n" and exit if $#ARGV == 0;
    my $class = shift @ARGV;
    print "No subroutine specified\n" and exit if $#ARGV < 0;
    my $subroutine = shift @ARGV;

    return $class, $options, $subroutine, \@ARGV;
}

sub usage {
    print `perldoc $0`;
}

#### PARSE OPTIONS
my ($class, $options, $subroutine, $args) = getopts();

my $opsdir = $options->{opsdir};
my $opsmodloaded = 0;
if ( defined $opsdir ) {
	my $filepath 	= 	"$opsdir/$class.pm";
	my $location    = 	"$class.pm";
	if ( -f $filepath ) {
		print "\nLoading class: $class.pm\n\n";
		unshift @INC, $opsdir;
	
		my $klass = 'Agua::Ops';
		$klass->meta->make_mutable;
		Moose::Util::apply_all_roles($klass->meta, ($class));
		$klass->meta->make_immutable;
		
		$opsmodloaded = 1;
	}
}
else {
	$opsmodloaded = 1;
}

#######################################################################################
package Object;
use Moose;
extends 'Agua::Ops';

use Data::Dumper;
use FindBin qw($Bin);
use lib "$Bin";

# STRING
has 'user'  	=>  ( isa => 'Str', is => 'rw' );
has 'hosts'  	=>  ( isa => 'Str', is => 'rw' );
has 'keyfile'  	=>  ( isa => 'Str', is => 'rw' );
has 'logfile'  	=>  ( isa => 'Str', is => 'rw' );
has 'conffile'  =>  ( isa => 'Str', is => 'rw' );
has 'config'  	=>  ( isa => 'Str', is => 'rw' );
has 'login'  	=>  ( isa => 'Str', is => 'rw' );
has 'token'  	=>  ( isa => 'Str', is => 'rw' );

# OBJECTS
has 'dbobject'	=> ( isa => 'Agua::DBase::MySQL', is => 'rw', required => 0 );
has 'conf' 	=> (
	is =>	'rw',
	'isa' => 'Conf::Agua',
	default	=>	sub { Conf::Agua->new(	memory	=>	1	);	}
);

sub init {
	my $self		=	shift;
    if ( exists $options->{"hosts"} )
    {
		print "ops::new    options->{hosts} exists\n" if $DEBUG;
        my @hostnames = split ",", $options->{"hosts"};
        foreach my $host ( @hostnames ) {
            my $host = $options->{"hosts"} if $DEBUG;
            print "ops::new    host: $host\n";
            $self->hostname($host);
            $self->setSsh();
            $self->$subroutine(@$args);
        }
    }
    elsif ( exists $options->{"host"} )
    {
		print "ops::new    options->{host} exists\n" if $DEBUG;
        my $host = $options->{"host"};
        print "ops::new    host: $host\n";
        $self->hostname($host);
        $self->setSsh();
        $self->$subroutine(@$args);
    }
    else
    {
        print "ops::new    Doing local commands.\n" if $DEBUG;
        print "ops::new    subroutine: $subroutine\n" if $DEBUG;
        print "ops::new    args: @$args\n" if $DEBUG;
	
        my $data = $self->$subroutine(@$args);
		return if not defined $data;
		if ( ref($data) 	)	{
			my $parser = JSON->new();
			my $json = $parser->pretty->indent->encode($data);
			print $json;
		}
    }
}

#######################################################################################

#### GET CONF
my $configfile = "$Bin/../../conf/default.conf";
my $logfile	=	"/tmp/agua-ops.log";
my $conf = Conf::Agua->new({
	inputfile 	=> 	$configfile,
	logfile		=>	$logfile,
	SHOWLOG		=>	2,
	PRINTLOG	=>	5
});

#### SET DEFAULT OPTIONS
$options->{conffile} 	= 	"$Bin/../../conf/default.conf" if not defined $options->{conffile};
$options->{logfile} 	= 	$logfile if not defined $options->{logfile};
$options->{SHOWLOG}		=	2;
$options->{PRINTLOG}	=	5;
$options->{conf}		=	$conf;
$options->{opsmodloaded}=	$opsmodloaded;

my $object = Object->new($options);
$object->init();

