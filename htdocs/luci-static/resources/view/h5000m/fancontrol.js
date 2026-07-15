'use strict';
'require view';
'require form';
'require fs';
'require poll';
'require ui';

return view.extend({
	load: function() {
		return this.fetchStatus();
	},

	fetchStatus: function() {
		return fs.exec('/usr/sbin/h5000m-fancontrol', [ 'status' ]).then(L.bind(function(res) {
			return this.parseStatus(res.stdout || '');
		}, this)).catch(function() {
			return {};
		});
	},

	parseStatus: function(text) {
		var data = {};
		text.trim().split(/\n/).forEach(function(line) {
			var pos = line.indexOf('=');
			if (pos > -1)
				data[line.substring(0, pos)] = line.substring(pos + 1);
		});
		return data;
	},

	toNum: function(value, fallback) {
		var n = parseInt(value, 10);
		return isNaN(n) ? fallback : n;
	},

	clamp: function(value, min, max) {
		return Math.max(min, Math.min(max, value));
	},

	setText: function(id, value) {
		var node = document.getElementById(id);
		if (node)
			node.textContent = value;
	},

	formatTemp: function(value) {
		return value !== undefined && value !== null && value !== '' ? _('%s °C').format(value) : _('Unavailable');
	},

	formatPwm: function(value) {
		var pwm = this.toNum(value, NaN);
		return isNaN(pwm) ? _('Unavailable') : _('%s / 255 · %s%%').format(pwm, Math.round(this.clamp(pwm, 0, 255) * 100 / 255));
	},

	modeName: function(mode) {
		if (mode === 'manual') return _('Manual');
		if (mode === 'kernel') return _('Kernel protection only');
		return _('Automatic');
	},

	profileName: function(profile) {
		if (profile === 'silent') return _('Quiet');
		if (profile === 'performance') return _('Performance');
		if (profile === 'custom') return _('Custom');
		return _('Balanced');
	},

	reasonName: function(reason) {
		var kernelFloor = (reason || '').indexOf('+kernel-floor') > -1;
		var base = (reason || '').replace('+kernel-floor', '');
		var text;
		if (base === 'auto-down-delay') text = _('Waiting before speed down');
		else if (base === 'auto') text = _('Automatic curve');
		else if (base === 'manual') text = _('Manual request');
		else if (base === 'kernel') text = _('Kernel protection');
		else if (base === 'sensor-failsafe') text = _('Sensor failsafe');
		else if (base === 'curve-failsafe') text = _('Curve failsafe');
		else text = base || '-';
		return kernelFloor ? _('%s · kernel safety floor').format(text) : text;
	},

	styleNode: function() {
		return E('style', {}, [
			'.h5fan{--fan-green:#36c98f;--fan-blue:#55a8ff;--fan-amber:#f0aa46;--fan-red:#ef6262}',
			'.h5fan-hero{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:2px 2px 13px;margin:0 0 14px;border-bottom:1px solid var(--border-color-low,#e8e8e8)}',
			'.h5fan-hero h2{margin:0 0 4px;font-size:22px;line-height:1.3}.h5fan-hero p{margin:0;color:var(--text-color-medium,#666);font-size:13px}',
			'.h5fan-health{display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;background:var(--background-color-high,#f5f5f5);color:var(--fan-green)}',
			'.h5fan-health:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}',
			'.h5fan-health.warn{color:var(--fan-amber)}.h5fan-health.fail{color:var(--fan-red)}',
			'.h5fan-grid{display:grid;grid-template-columns:repeat(4,minmax(145px,1fr));gap:12px;margin-bottom:16px}',
			'.h5fan-card{position:relative;overflow:hidden;min-height:88px;padding:14px;border:1px solid var(--border-color-medium,#d8d8d8);border-radius:10px;background:var(--background-color-high,#fff)}',
			'.h5fan-card.primary{border-color:rgba(54,201,143,.45);background:linear-gradient(160deg,rgba(54,201,143,.12),rgba(54,201,143,.025))}',
			'.h5fan-card-title{font-size:12px;color:var(--text-color-medium,#666);margin-bottom:8px}.h5fan-card-value{font-size:21px;font-weight:650;line-height:1.2;color:var(--text-color-high,#222)}',
			'.h5fan-card-hint{font-size:11px;color:var(--text-color-low,#888);margin-top:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.h5fan-card.temperatures{grid-column:span 4;padding-bottom:12px}.h5fan-temp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.h5fan-temp-head .h5fan-card-title{margin:0}.h5fan-temp-source{font-size:11px;color:var(--fan-blue);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.h5fan-temp-grid{display:grid;grid-template-columns:repeat(4,minmax(86px,1fr));gap:8px}',
			'.h5fan-temp-item{min-width:0;padding:8px 10px;border-radius:8px;background:rgba(127,127,127,.055)}.h5fan-temp-label{font-size:11px;color:var(--text-color-medium,#777);white-space:nowrap}',
			'.h5fan-temp-item.active{background:rgba(85,168,255,.11);box-shadow:inset 0 0 0 1px rgba(85,168,255,.32)}.h5fan-temp-item.active .h5fan-temp-label{color:var(--fan-blue)}',
			'.h5fan-temp-value{margin-top:4px;font-size:17px;font-weight:650;color:var(--text-color-high,#222);white-space:nowrap}.h5fan-temp-hint{margin-top:3px;font-size:10px;color:var(--text-color-low,#888);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.h5fan-section{margin:0 0 16px;padding:16px;border:1px solid var(--border-color-medium,#d8d8d8);border-radius:12px;background:var(--background-color-high,#fff)}',
			'.h5fan-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.h5fan-section h3{margin:0}',
			'.h5fan-badge{padding:4px 8px;border-radius:6px;background:rgba(85,168,255,.12);color:var(--fan-blue);font-size:11px}',
			'.h5fan-curve-layout{display:grid;grid-template-columns:minmax(300px,1fr) 190px;gap:14px}.h5fan-canvas{width:100%;height:220px;display:block;border:1px solid rgba(54,201,143,.13);border-radius:12px;background:#f7faf9}',
			'.h5fan-side{display:grid;gap:10px}.h5fan-chip{padding:11px;border:1px solid var(--border-color-low,#ddd);border-radius:8px;background:rgba(127,127,127,.045)}',
			'.h5fan-chip span{display:block;font-size:11px;color:var(--text-color-medium,#777);margin-bottom:5px}.h5fan-chip strong{font-size:18px}',
			'.h5fan-note{margin-top:12px;padding:10px 12px;border-left:3px solid var(--fan-blue);background:rgba(85,168,255,.07);color:var(--text-color-medium,#666);font-size:12px}',
			'.h5fan-slider{display:flex;align-items:center;gap:10px;max-width:480px}.h5fan-slider input[type=range]{flex:1;min-width:190px}.h5fan-slider input[type=number]{width:84px}',
			'@media(max-width:1050px){.h5fan-grid{grid-template-columns:repeat(2,minmax(145px,1fr))}.h5fan-card.temperatures{grid-column:span 2}.h5fan-temp-grid{grid-template-columns:repeat(4,minmax(72px,1fr))}}',
			'@media(max-width:750px){.h5fan-curve-layout{grid-template-columns:1fr}.h5fan-side{grid-template-columns:repeat(3,1fr)}}',
			'@media(max-width:520px){.h5fan-hero{display:block}.h5fan-health{margin-top:12px}}',
			'@media(max-width:520px){.h5fan-grid{grid-template-columns:1fr}.h5fan-card.temperatures{grid-column:span 1}.h5fan-temp-grid{grid-template-columns:repeat(2,minmax(110px,1fr))}.h5fan-side{grid-template-columns:1fr}.h5fan-slider{align-items:stretch;flex-direction:column}.h5fan-slider input[type=range]{width:100%;min-width:0}}'
		].join(''));
	},

	card: function(id, title, primary) {
		return E('div', { 'class': 'h5fan-card' + (primary ? ' primary' : '') }, [
			E('div', { 'class': 'h5fan-card-title', id: id + '-title' }, title),
			E('div', { 'class': 'h5fan-card-value', id: id + '-value' }, _('Loading…')),
			E('div', { 'class': 'h5fan-card-hint', id: id + '-hint' }, '')
		]);
	},

	temperatureItem: function(id, title) {
		return E('div', { 'class': 'h5fan-temp-item', id: id }, [
			E('div', { 'class': 'h5fan-temp-label' }, title),
			E('div', { 'class': 'h5fan-temp-value', id: id + '-value' }, _('Loading…')),
			E('div', { 'class': 'h5fan-temp-hint', id: id + '-hint' }, '')
		]);
	},

	temperatureCard: function() {
		return E('div', { 'class': 'h5fan-card temperatures' }, [
			E('div', { 'class': 'h5fan-temp-head' }, [
				E('div', { 'class': 'h5fan-card-title' }, _('Temperature')),
				E('div', { 'class': 'h5fan-temp-source', id: 'h5fan-temp-source' }, '')
			]),
			E('div', { 'class': 'h5fan-temp-grid' }, [
				this.temperatureItem('h5fan-cpu', _('CPU')),
				this.temperatureItem('h5fan-phy', _('Ethernet PHY')),
				this.temperatureItem('h5fan-wifi', _('Wi-Fi radios')),
				this.temperatureItem('h5fan-modem', _('5G modem'))
			])
		]);
	},

	statusPanel: function() {
		return E('div', {}, [
			E('div', { 'class': 'h5fan-hero' }, [
				E('div', {}, [ E('h2', _('Cooling management')), E('p', _('Automatically balances cooling and noise based on device temperatures.')) ]),
				E('div', { 'class': 'h5fan-health', id: 'h5fan-health' }, _('Checking…'))
			]),
			E('div', { 'class': 'h5fan-grid' }, [
				this.temperatureCard()
			])
		]);
	},

	parseCurve: function(text) {
		var points = [];
		(text || '').split(',').forEach(function(pair) {
			var parts = pair.split(':'), temp = parseInt(parts[0], 10), percent = parseInt(parts[1], 10);
			if (parts.length === 2 && !isNaN(temp) && !isNaN(percent))
				points.push({ temp: temp, percent: percent });
		});
		return points;
	},

	drawCurve: function(data) {
		var canvas = document.getElementById('h5fan-curve'), points = this.parseCurve(data.curve_data);
		var ratio, width, height, ctx, left = 24, top = 28, right = 24, bottom = 32, plotW, plotH;
		var minT = 20, maxT = 110, x, y, background, gradient, controlTemp, requested, markerX, markerY, markerText, markerWidth, markerLeft;
		if (!canvas || points.length < 2) return;
		width = canvas.clientWidth || 700; height = canvas.clientHeight || 220; ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
		ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		plotW = width - left - right; plotH = height - top - bottom;
		x = function(temp) { return left + Math.max(0, Math.min(1, (temp - minT) / (maxT - minT))) * plotW; };
		y = function(percent) { return top + (100 - Math.max(0, Math.min(100, percent))) * plotH / 100; };
		background = ctx.createLinearGradient(0, 0, width, height); background.addColorStop(0, '#fbfdfc'); background.addColorStop(1, '#f1f7f4');
		ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
		ctx.strokeStyle = 'rgba(74,104,91,.10)'; ctx.lineWidth = 1; ctx.beginPath();
		[25, 50, 75].forEach(function(level) { ctx.moveTo(left, y(level)); ctx.lineTo(left + plotW, y(level)); });
		ctx.stroke();
		gradient = ctx.createLinearGradient(0, top, 0, top + plotH); gradient.addColorStop(0, 'rgba(54,201,143,.30)'); gradient.addColorStop(1, 'rgba(54,201,143,.025)');
		ctx.beginPath(); ctx.moveTo(x(points[0].temp), top + plotH);
		points.forEach(function(p) { ctx.lineTo(x(p.temp), y(p.percent)); });
		ctx.lineTo(x(points[points.length - 1].temp), top + plotH); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
		ctx.beginPath(); points.forEach(function(p, index) { if (index) ctx.lineTo(x(p.temp), y(p.percent)); else ctx.moveTo(x(p.temp), y(p.percent)); });
		ctx.save(); ctx.strokeStyle = '#31ba80'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(49,186,128,.25)'; ctx.shadowBlur = 8; ctx.stroke(); ctx.restore();
		controlTemp = this.toNum(data.control_temp, NaN); requested = this.toNum(data.requested_pwm, NaN);
		if (!isNaN(controlTemp) && !isNaN(requested)) {
			markerX = x(controlTemp); markerY = y(requested * 100 / 255); markerText = Math.round(controlTemp) + '°C · ' + Math.round(requested * 100 / 255) + '%';
			ctx.font = '600 11px sans-serif'; markerWidth = ctx.measureText(markerText).width + 18; markerLeft = Math.max(8, Math.min(width - markerWidth - 8, markerX - markerWidth / 2));
			ctx.fillStyle = '#24342d'; ctx.fillRect(markerLeft, Math.max(6, markerY - 31), markerWidth, 23);
			ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(markerText, markerLeft + 9, Math.max(6, markerY - 31) + 11.5);
			ctx.beginPath(); ctx.arc(markerX, markerY, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#31ba80'; ctx.lineWidth = 3; ctx.stroke();
		}
		ctx.fillStyle = '#7d9188'; ctx.font = '11px sans-serif'; ctx.textBaseline = 'top';
		[35, 60, 85].forEach(function(t) { ctx.fillText(t + '°', x(t) - 9, top + plotH + 10); });
	},

	curvePanel: function() {
		return E('div', { 'class': 'h5fan-section' }, [
			E('div', { 'class': 'h5fan-section-head' }, [ E('h3', _('Effective fan policy')), E('span', { 'class': 'h5fan-badge', id: 'h5fan-profile' }, '-') ]),
			E('div', { 'class': 'h5fan-curve-layout' }, [
				E('canvas', { 'class': 'h5fan-canvas', id: 'h5fan-curve', width: 720, height: 220 }),
				E('div', { 'class': 'h5fan-side' }, [
					E('div', { 'class': 'h5fan-chip' }, [ E('span', _('Requested output')), E('strong', { id: 'h5fan-requested' }, '-') ]),
					E('div', { 'class': 'h5fan-chip' }, [ E('span', _('Applied output')), E('strong', { id: 'h5fan-applied' }, '-') ]),
					E('div', { 'class': 'h5fan-chip' }, [ E('span', _('Policy reason')), E('strong', { id: 'h5fan-reason' }, '-') ])
				])
			]),
			E('div', { 'class': 'h5fan-note', id: 'h5fan-safety-note' }, _('Kernel thermal protection is always retained. Requested output may be raised automatically when the kernel requires more cooling.'))
		]);
	},

	updateStatus: function(data) {
		var pwm = this.toNum(data.pwm_value, NaN);
		var age = this.toNum(data.state_age, NaN), interval = this.toNum(data.interval, 5), health = document.getElementById('h5fan-health');
		var requested = this.toNum(data.requested_pwm, NaN), applied = this.toNum(data.applied_pwm || data.pwm_value, NaN);
		this.lastStatus = data;
		this.setText('h5fan-temp-source', _('Current input: %s').format((data.control_sensor || _('No valid sensor')) + ' · ' + this.formatTemp(data.control_temp)));
		['cpu', 'phy', 'wifi', 'modem'].forEach(function(name) {
			var node = document.getElementById('h5fan-' + name);
			var active = name === 'cpu' && data.control_sensor === data.cpu_label ||
				name === 'phy' && data.control_sensor === data.phy_label ||
				name === 'wifi' && (data.control_sensor === data.wifi1_label || data.control_sensor === data.wifi2_label) ||
				name === 'modem' && data.control_sensor === '5G modem';
			if (node) node.classList.toggle('active', !!active);
		});
		if (data.thermal_owner === 'userspace') {
			this.setText('h5fan-safety-note', _('The fan manager has exclusive fan policy control. Kernel CPU throttling and hot/critical over-temperature protection remain active.'));
		} else {
			this.setText('h5fan-safety-note', _('Kernel thermal protection is always retained. Requested output may be raised automatically when the kernel requires more cooling.'));
		}
		this.setText('h5fan-cpu-value', this.formatTemp(data.cpu_temp)); this.setText('h5fan-cpu-hint', data.cpu_label || '');
		this.setText('h5fan-phy-value', this.formatTemp(data.phy_temp)); this.setText('h5fan-phy-hint', data.phy_label || '');
		this.setText('h5fan-wifi-value', data.wifi1_temp || data.wifi2_temp ? [data.wifi1_temp, data.wifi2_temp].filter(Boolean).join(' / ') + ' °C' : _('Unavailable'));
		this.setText('h5fan-wifi-hint', [data.wifi1_label, data.wifi2_label].filter(Boolean).join(' · '));
		this.setText('h5fan-modem-value', this.formatTemp(data.module_temp)); this.setText('h5fan-modem-hint', _('From the local modem cache'));
		this.setText('h5fan-profile', this.modeName(data.mode) + (data.mode === 'auto' ? ' · ' + this.profileName(data.curve) : ''));
		this.setText('h5fan-requested', isNaN(requested) ? '-' : Math.round(requested * 100 / 255) + '%');
		this.setText('h5fan-applied', isNaN(applied) ? (isNaN(pwm) ? '-' : Math.round(pwm * 100 / 255) + '%') : Math.round(applied * 100 / 255) + '%');
		this.setText('h5fan-reason', this.reasonName(data.reason));
		if (health) {
			health.className = 'h5fan-health';
			if (data.result === 'failsafe') { health.className += ' fail'; health.textContent = _('Failsafe cooling'); }
			else if (isNaN(age) || age > interval * 3 + 5) { health.className += ' warn'; health.textContent = _('Status delayed'); }
			else { health.textContent = _('Running normally'); }
		}
		this.drawCurve(data);
	},

	validateCurve: function(sectionId, value) {
		var points = this.parseCurve(value), last = -1;
		if (points.length < 2 || points.map(function(p) { return p.temp + ':' + p.percent; }).join(',') !== value.replace(/\s+/g, ''))
			return _('Use comma-separated temperature:percent points, for example 35:0,45:50,70:80,90:100.');
		for (var i = 0; i < points.length; i++) {
			if (points[i].temp <= last || points[i].temp < 0 || points[i].temp > 150 || points[i].percent < 0 || points[i].percent > 100)
				return _('Temperatures must increase from 0–150 °C and percentages must be 0–100.');
			last = points[i].temp;
		}
		return true;
	},

	renderManualPwmWidget: function(option) {
		option.renderWidget = function(sectionId, optionIndex, cfgvalue) {
			var value = cfgvalue || this.default || '160', id = this.cbid(sectionId), rangeId = id + '-range', numberId = id + '-number';
			function sync(value, source) {
				var range = document.getElementById(rangeId), number = document.getElementById(numberId), hidden = document.getElementById(id);
				value = Math.max(0, Math.min(255, parseInt(value, 10) || 0));
				if (range && source !== range) range.value = value;
				if (number && source !== number) number.value = value;
				if (hidden) hidden.value = value;
			}
			return E('div', { 'class': 'h5fan-slider' }, [
				E('input', { id: rangeId, type: 'range', min: 0, max: 255, step: 1, value: value, oninput: function(ev) { sync(ev.target.value, ev.target); } }),
				E('input', { id: numberId, type: 'number', min: 0, max: 255, step: 1, value: value, oninput: function(ev) { sync(ev.target.value, ev.target); } }),
				E('input', { id: id, name: id, type: 'hidden', value: value })
			]);
		};
	},

	renderForm: function() {
		var m = new form.Map('h5000m_fancontrol', _('Cooling policy'));
		var s = m.section(form.NamedSection, 'settings', 'settings'), o;
		m.description = _('Choose a cooling profile or set a manual output. Safety limits remain active in every mode.');
		s.anonymous = true;
		s.tab('policy', _('Policy'));
		s.tab('safety', _('Response & safety'));

		o = s.taboption('policy', form.Flag, 'enabled', _('Enable enhanced controller'));
		o.default = '1'; o.rmempty = false;
		o.description = _('When disabled, the fan follows the kernel thermal protection level only.');

		o = s.taboption('policy', form.ListValue, 'mode', _('Operating mode'));
		o.value('auto', _('Automatic')); o.value('manual', _('Manual')); o.value('kernel', _('Kernel protection only'));
		o.default = 'auto'; o.rmempty = false; o.depends('enabled', '1');

		o = s.taboption('policy', form.ListValue, 'curve', _('Cooling profile'));
		o.value('silent', _('Quiet')); o.value('balanced', _('Balanced')); o.value('performance', _('Performance')); o.value('custom', _('Custom'));
		o.default = 'balanced'; o.rmempty = false; o.depends({ enabled: '1', mode: 'auto' });

		o = s.taboption('policy', form.Value, 'curve_custom', _('Custom curve'));
		o.default = '20:0,40:50,55:60,70:75,85:90,95:100'; o.rmempty = false; o.depends({ enabled: '1', mode: 'auto', curve: 'custom' });
		o.description = _('Comma-separated temperature:percent points. The controller interpolates between points.');
		o.validate = L.bind(this.validateCurve, this);

		o = s.taboption('policy', form.ListValue, 'temp_source', _('Control temperature'));
		o.value('max', _('Hottest available sensor')); o.value('cpu', _('CPU only')); o.default = 'max'; o.rmempty = false; o.depends({ enabled: '1', mode: 'auto' });
		o.description = _('The hottest-sensor option considers CPU, Ethernet PHY, Wi-Fi and the available 5G modem cache.');

		o = s.taboption('policy', form.Value, 'manual_pwm', _('Manual PWM output'));
		o.datatype = 'range(0,255)'; o.default = '160'; o.rmempty = false; o.depends({ enabled: '1', mode: 'manual' });
		o.description = _('The kernel safety floor may raise the effective output above this value.');
		this.renderManualPwmWidget(o);

		o = s.taboption('safety', form.Value, 'interval', _('Control interval'));
		o.datatype = 'range(2,60)'; o.default = '5'; o.rmempty = false; o.description = _('Seconds between control decisions. The dashboard refreshes independently.');

		o = s.taboption('safety', form.Value, 'hysteresis', _('Temperature hysteresis'));
		o.datatype = 'range(0,10)'; o.default = '2'; o.rmempty = false; o.description = _('Prevents repeated speed changes around a curve point.');

		o = s.taboption('safety', form.Value, 'down_delay', _('Speed-down delay'));
		o.datatype = 'range(0,300)'; o.default = '30'; o.rmempty = false; o.description = _('Wait this many seconds before lowering fan output; temperature increases are applied immediately.');

		o = s.taboption('safety', form.Value, 'start_pwm', _('Startup boost PWM'));
		o.datatype = 'range(80,255)'; o.default = '192'; o.rmempty = false;

		o = s.taboption('safety', form.Value, 'start_boost_ms', _('Startup boost duration'));
		o.datatype = 'range(0,3000)'; o.default = '700'; o.rmempty = false; o.description = _('A short boost helps a stopped fan start reliably. Set 0 to disable.');

	m.handleSaveApply = function(ev, mode) {
		return form.Map.prototype.handleSaveApply.apply(this, [ ev, mode ]).then(function() {
			return fs.exec('/etc/init.d/h5000m-fancontrol', [ 'restart' ]);
		}).then(function() {
			ui.addNotification(null, E('p', _('Cooling policy applied successfully.')));
		}, function(err) {
			ui.addNotification(null, E('p', _('Failed to apply cooling policy:') + ' ' + err.message), 'danger');
		});
	};
		return m;
	},

	render: function(data) {
		var formMap = this.renderForm();
		return formMap.render().then(L.bind(function(formNode) {
			var root = E('div', { 'class': 'h5fan' }, [ this.styleNode(), this.statusPanel(), this.curvePanel(), formNode ]);
			window.setTimeout(L.bind(function() { this.updateStatus(data); }, this), 0);
			poll.add(L.bind(function() {
				return this.fetchStatus().then(L.bind(function(next) { this.updateStatus(next); }, this));
			}, this), 3);
			return root;
		}, this));
	}
});
