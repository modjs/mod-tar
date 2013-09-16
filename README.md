tar
===

Create/extract a tarball

### Usage
```
module.exports = {
    plugins: {
        "tar": "mod-tar"
    },
    tasks: {
        "tar": {
            pack: {
                src: "./foo",
                dest: "foo.tar.gz"
            },
            unpack: {
                action: "extract",
                src: "foo.tar.gz",
                dest: "./bar"
            }
        }
    },
    targets: {
        dist: "tar:pack tar:unpack"
    }
};
```