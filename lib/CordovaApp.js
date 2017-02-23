// imports
let async = require('async'),
	child_process = require('child_process'),
	fs = require('fs'),
	path = require('path'),
	pug = require('pug');

/**
 * This class represents a cordova app.
 *
 * @author Martin Bories <martin.christian.bories@gmail.com>
 */
class CordovaApp {

	/**
	 * Initializes the app.
	 *
	 * @author Martin Bories <martin.christian.bories@gmail.com>
	 * @param path	String	the path to the app's root directory; that directory contains folders such as "www", "platforms", "hooks" and "plugins"
	 */
	constructor(path) {
		this.path = path;
	}

	/**
	 * Sets the template path, relative to the www-directory of the application.
	 * This class will automatically look for pugjs templates and compile them.
	 *
	 * @author Martin Bories <martin.christian.bories@gmail.com>
	 * @param templatePath	String	the template templatePath
	 * @return CordovaApp	the app itself
	 */
	setTemplatePath(templatePath) {
		this.templatePath = path.join(this.path, 'www', templatePath);
		return this;
	}

	/**
	 * Builds the app.
	 *
	 * @author Martin Bories <martin.christian.bories@gmail.com>
	 * @param platformName	String	optional; the name of the platform for that to build; default: android
	 * @param next	Function	callback; gets called once the build has been finished; next([err])
	 */
	build(platformName, next) {
		// switch parameters
		if (!next) {
			next = platformName;
			platformName = 'android';
		}

		// compile templates & build app
		async.series([
			// compile templates
			(next) => {
				if (!this.templatePath) return next();

				// scans the folder
				let scanFolder = (directory, next) => {
					// search for pugjs files
					fs.readdir(directory, (err, files) => {
						if (err) return next(err);

						// loop through files & compile pugjs files
						async.each(files, (filename, next) => {
							if (path.extname(filename) != '.pug') {
								return fs.stat(path.join(directory, filename), (err, stats) => {
									if (err) return next(err);

									if (stats.isDirectory()) return scanFolder(path.join(directory, filename), next);
									next();
								});
							}

							// compile to html
							fs.readFile(path.join(directory, filename), (err, content) => {
								if (err) return next(err);

								// save compiled template
								let html = pug.render(content.toString(), {
										filename: path.join(directory, filename)
									});
								fs.writeFile(path.join(directory, path.basename(filename, '.pug')+'.tpl'), html, next);
							})
						}, next);
					})	
				};

				// scan template path
				scanFolder(this.templatePath, next);
			},

			// build cordova app
			(next) => {
				// fire build command
				let command = path.join(process.env.APPDATA, 'npm', 'node_modules', 'cordova', 'bin', 'cordova.cmd'),
					child = child_process.spawn(command, ['build', platformName], {
						cwd: this.path
					});

				// register event listeners
				child.on('error', (err) => {
					next(err);
				});
				child.on('exit', (code, signal) => {
					if (code != 0) return next('Child process exited with code: '+code);

					next();
				});
			}
		], next);
	}

	/**
	 * Runs the app.
	 *
	 * @author Martin Bories <martin.christian.bories@gmail.com>
	 * @param platformName	String	optional; the name of the platform for that to build & run; default: android
	 * @param next	Function	callback; gets called once the app has been started next([err])
	 */
	run(platformName, next) {
		// switch parameters
		if (!next) {
			next = platformName;
			platformName = 'android';
		}

		// fire build command
		let command = path.join(process.env.APPDATA, 'npm', 'node_modules', 'cordova', 'bin', 'cordova.cmd'),
			child = child_process.spawn(command, ['run', platformName], {
				cwd: this.path
			});

		// register event listeners
		child.on('error', (err) => {
			next(err);
		});
		child.on('exit', (code, signal) => {
			if (code != 0) return next('Child process exited with code: '+code);

			next();
		});
	}

};

module.exports = CordovaApp;