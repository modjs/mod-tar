var tar = require('./lib/tar');
var path = require('path');

exports.summary = 'Create/extract a tarball';

exports.usage = '<src> [options]';

exports.options = {
    "dest" : {
        alias : 'd'
        ,describe : 'target pack file path'
    },
    "action": {
        alias : 'a'
        ,default: 'create'
        ,describe : 'create or extract'
    }
};

exports.run = function (options, done) {
    var source = options.src;
    var target = options.dest;
    var action = options.action;
    exports[action](source, target, done);
};

exports.create = function(source, target, done){
    if(!target && exports.file.findPackageJSON(source)){
        var cfg = exports.file.readPackageJSON(source);
        target = cfg.name + '-' + cfg.version + '.tar.gz';
    }
    tar.create(source, target, cfg, exports, done);    
};

exports.extract = function(source, target, done) {
    tar.extract(source, target, exports, done);
};
