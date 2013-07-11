var Packer = require('./packer'),
    fstream = require('fstream'),
    tar = require('tar'),
    zlib = require('zlib'),
    path = require('path'),
    fs = require('fs');

var isWindows = process.platform === 'win32';
var umask = parseInt(022, 8);
var modes = {
    exec: 0777 & (~umask),
    file: 0666 & (~umask),
    umask: umask
};

var myUid = process.getuid && process.getuid(),
    myGid = process.getgid && process.getgid();

if (process.env.SUDO_UID && myUid === 0) {
    if (!isNaN(process.env.SUDO_UID)) {
        myUid = +process.env.SUDO_UID;
    }
    if (!isNaN(process.env.SUDO_GID)) {
        myGid = +process.env.SUDO_GID;
    }
}


exports.create = function(cfg, source, target, logger, done) {

    logger.log('creating', target);

    function returnError(err) {
        // don't call the done multiple times, just return the first error
        var _done = done;
        done = function () {};
        return _done(err);
    }

    var fwriter = fstream.Writer({ type: 'File', path: target });
    fwriter.on('error', function (err) {
        logger.error('error writing ' + target);
        //logger.error(err);
        return returnError(err);
    });
    fwriter.on('close', function () {
        done(null, target);
    });

    var istream = Packer({
        packageInfo: cfg,
        path: source,
        type: "Directory",
        isDirectory: true
    });
    istream.on('error', function (err) {
        logger.error('error reading ' + source);
        //logger.error(err);
        return returnError(err);
    });
    istream.on("child", function (c) {
        //var root = path.resolve(c.root.path, '../package');
        //logger.info('adding', c.path.substr(root.length + 1));
    });

    var packer = tar.Pack({ noProprietary: true });
    packer.on('error', function (err) {
        logger.error('tar creation error ' + target);
        //logger.error(err);
        return returnError(err);
    });

    var zipper = zlib.Gzip();
    zipper.on('error', function (err) {
        logger.error('gzip error ' + target);
        //logger.error(err);
        return returnError(err);
    });

    istream.pipe(packer).pipe(zipper).pipe(fwriter);
};


exports.extract = function (source, target, logger, done) {

    logger.log('extracting', source);

    var umask = modes.umask;
    var dmode = modes.dmode;
    var fmode = modes.fmode;

    function returnError(err) {
        // don't call the done multiple times, just return the first error
        var _done = done;
        done = function () {};
        return _done(err);
    }

    var freader = fs.createReadStream(source);
    freader.on('error', function (err) {
        logger.error('error reading ' + source);
        //logger.error(err);
        return returnError(err);
    });

    var extract_opts = {
        type: 'Directory',
        path: target,
        strip: 1,
        filter: function () {
            // symbolic links are not allowed in packages
            if (this.type.match(/^.*Link$/)) {
                logger.warn(
                    'excluding symbolic link',
                    this.path.substr(target.length + 1) + ' -> ' + this.linkpath
                );
                return false;
            }
            return true;
        }
    };
    if (!isWindows && typeof myUid === "number" && typeof myGid === "number") {
        extract_opts.uid = myUid;
        extract_opts.gid = myGid;
    }
    var extractor = tar.Extract(extract_opts);
    extractor.on('error', function (err) {
        logger.error('untar error ' + source);
        //logger.error(err);
        return returnError(err);
    });
    extractor.on('entry', function (entry) {
        //logger.info('extracting', entry.path);
        entry.mode = entry.mode || entry.props.mode;
        var original_mode = entry.mode;
        entry.mode = entry.mode | (entry.type === "Directory" ? dmode: fmode);
        entry.mode = entry.mode & (~umask);

        if (process.platform !== "win32" &&
            typeof myUid === "number" && typeof myGid === "number") {
            entry.props.uid = entry.uid = myUid;
            entry.props.gid = entry.gid = myGid;
        }
    });
    extractor.on('end', function () {
        return done(null, target);
    });

    var unzipper = zlib.Unzip();
    unzipper.on('error', function (err) {
        logger.error('unzip error ' + source);
        //logger.error(err);
        return returnError(err);
    });

    freader.pipe(unzipper).pipe(extractor);
};
