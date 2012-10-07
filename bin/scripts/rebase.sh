#!/bin/sh

# detach head and move to D commit
git checkout $2

# move HEAD to A, but leave the index and working tree as for D
git reset --soft $1

# Redo the D commit re-using the commit message, but now on top of A
git commit -C $2

# Re-apply everything from the old D onwards onto this new place 
git rebase --onto HEAD $2 master
