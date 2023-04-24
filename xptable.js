/* XP tables generic - start */
var xptable_data = {};
var xpTableCounter = 0;

	
$( document ).ready(function() {
	initXPTable();
	$(".xpcalc .controls > .levels input").on("change mouseup keyup click", function(){updateXPTable($(this).closest("table"));});
	$(".xpcalc .controls > .items input").on("change mouseup keyup click", function(){updateXPTable($(this).closest("table"), false);});
	$(".xpcalc .controls > .items img").on("click", function(e){addItemCount($(this).closest("table"), $(this).closest("div.item").attr('data-itemnumber'),e);});
	$(".xpcalc .xptable > div.content").children("div").on("click", function(){changeTargetLevel($(this).closest("table"),$(this).find('span.level').html());});
});
	

function initXPTable(){
	$(".xpcalc").each(function(){
		var id = 'xpcalc-'+(++xpTableCounter);
		$(this).attr('id',id);
		
		var data = {};
		data.settings = {
			'type': $(this).attr('data-type'), 
			'level_cap': parseInt($(this).attr('data-levelcap')),
			'max_level': parseInt($(this).attr('data-levelcap')),
			'default_level': parseInt($(this).attr('data-defaultlevel')) || parseInt($(this).attr('data-levelcap')), 
			'credit_price': parseInt($(this).attr('data-creditprice')) || 0, 
			'level_from': 0, 
			'level_to': 0, 
			'target_xp':0,
			'planned_xp':0,
			'xp_overshoot': 0,
			'total_credits': 0,
		};

		data.items = {};
		$(this).find(".controls > .items div.item").each(function(){
			var item_number = $(this).attr('data-itemnumber');
			var value = $(this).attr('data-value');
			data.items[item_number] = parseInt(value);
		});


		$(this).find(".xptable .content > div").each(function(){
			var level = $(this).find('span.level').html();
			data[level] = {};
			var xp = $(this).find('span.xp').html();
			var total_xp = $(this).find('span.total_xp').html();
			data[level] = {'xp':parseInt(xp), 'total_xp':parseInt(total_xp)};

			if (level >  data.settings.level_cap) {
				$(this).addClass('tbd').attr('title', "Currently not attainable in the game");
				data.settings.max_level = level;
				//console.log(`Level ${level} is outside of expected cap`);
			}
		});

		$(this).find(".controls > .levels .level-from").append('<input type="number" value="1" step="1" min="1" max="'+data.settings.max_level+'">');
		$(this).find(".controls > .levels .level-to").append('<input type="number" value="'+data.settings.default_level+'" step="1" min="1" max="'+data.settings.max_level+'">');
		$(this).find(".controls > .items .item").append('<input type="number" value="0" step="1" min="0" max="999"></span>');

		xptable_data[id] = data;

		updateXPTable($(this));
	});
}


function changeTargetLevel (xpcalc, target_level) {
	xpcalc.find('.controls > .levels > .level-to > input').val(target_level);
	updateXPTable(xpcalc);
}

function addItemCount (xpcalc, item_id, event) {
	var count = 1;
	if (event.shiftKey) count *= 10; 
	if (event.ctrlKey) count *= -1;

	var input = xpcalc.find('.controls > .items .item-'+item_id+' > input');
	input.val( parseInt(input.val())+count );
	updateXPTable(xpcalc, false);
}


function planXPItems (id) {
	//var data = xptable_data[id]
	var settings = xptable_data[id].settings;
	var items = xptable_data[id].items;
	var itemplan = new Array(Object.keys(items).length); for (let i=1; i<Object.keys(items).length+1; ++i) itemplan[i] = 0;
	var planned_xp = 0; //actual XP of planned items, should be >= target with minimal overshot
	var target_xp = 0; //the minimum XP amount needed to reach target level
	var hysteresis = items[1];
	

	for (var index = settings.level_from; index < settings.level_to; index++) {
		target_xp += xptable_data[id][index].xp;
	}
	settings.target_xp = target_xp;

	for (index = Object.keys(items).length; index > 0; index--) {
		itemplan[index] = Math.floor((target_xp + hysteresis)/items[index]);
		if ( itemplan[index] > 999 ) itemplan[index] = 999;
		planned_xp += items[index] * itemplan[index];
		target_xp -= items[index] * itemplan[index];

		//console.log(`Added item ${index} x ${itemplan[index]}, remaining target xp is ${target_xp} `);
	}
	settings.planned_xp = planned_xp;
	if (target_xp<0) settings.xp_overshoot = -target_xp;
	settings.total_credits = planned_xp*settings.credit_price;
	settings.itemplan = itemplan;
}
	

function getXPItems (xpcalc, id) {
	var data = xptable_data[id];
	var settings = xptable_data[id].settings;
	var items = xptable_data[id].items;
	var itemplan = new Array(Object.keys(items).length); 
	var planned_xp = 0; //actual XP of planned items, should be >= target with minimal overshot
	var target_xp = 0; //the minimum XP amount needed to reach target level
	//var hysteresis = items[1];
	//var level_to = 0;
	
	for (let index=1; index<Object.keys(items).length+1; ++index) {
		itemplan[index] = parseInt(xpcalc.find('.controls > .items .item-'+index+' > input').val());
		if (itemplan[index] < 0) itemplan[index] = 0; 
		planned_xp += items[index] * itemplan[index];
	}
	settings.itemplan = itemplan;
	settings.planned_xp = planned_xp;
	settings.total_credits = planned_xp*settings.credit_price;

	//console.log(`Starting with planned xp ${planned_xp}`)
	for (var index = settings.level_from; index < settings.max_level; index++) {
		if (planned_xp < data[index].xp) break;	 
		planned_xp -= data[index].xp;
		target_xp += data[index].xp;
		settings.level_to = index+1;
	}

	//console.log(`Upgraded to level ${settings.level_to } with remaining planned xp ${planned_xp}`);
	settings.target_xp = target_xp;
	settings.xp_overshoot = planned_xp;
	
	xpcalc.find('.controls > .levels > .level-to > input').val(settings.level_to);

}


function updateXPTable (xpcalc, optimize_items){
	optimize_items = (typeof optimize_items !== 'undefined') ? optimize_items : true; //default true, ES5 does not support function defaults

	var id = xpcalc.attr('id');
	var settings = xptable_data[id].settings;
	//console.log(settings);

	var level_from = parseInt(xpcalc.find('.controls > .levels > .level-from > input').val());
	var level_to = parseInt(xpcalc.find('.controls > .levels > .level-to > input').val());
	
	level_from = (typeof level_from !== 'undefined' && !isNaN(level_from)) ? level_from : 1;
	level_to = (typeof level_to !== 'undefined' && !isNaN(level_to)) ? level_to : settings.level_cap;
	
	if (level_from < 1) 	 				{ xpcalc.find('.controls > .levels > .level-from > input').val(1);	level_from = 1; }
	if (level_from >= settings.max_level) 	{ xpcalc.find('.controls > .levels > .level-from > input').val(settings.max_level-1); level_from = settings.max_level-1; }

	if (level_to <= level_from) 			{ xpcalc.find('.controls > .levels > .level-to > input').val(level_from+1);	level_to = level_from+1; }
	if (level_to > settings.max_level) 		{ xpcalc.find('.controls > .levels > .level-to > input').val(settings.max_level); level_to = settings.max_level; }

	settings.level_from = level_from;
	settings.level_to = level_to;

	//console.log (`Calculating Exp from level ${level_from} to ${level_to}`)
	if (optimize_items) planXPItems(id);
	else getXPItems(xpcalc, id);
	//console.log('Itemplan after is '+settings.itemplan);
	
	//console.log (`Exp ${settings.planned_xp}/${settings.target_xp}; total price ${settings.total_credits}`)

	
	for (var index = Object.keys(xptable_data[id].items).length; index > 0; index--) {
		xpcalc.find('.controls > .items .item-'+index+' > input').val(settings.itemplan[index]);
	}	
	
	xpcalc.find('.controls > .output > .total-xp > span').html(settings.planned_xp.toLocaleString());
	xpcalc.find('.controls > .output').attr('title','XP: '+settings.planned_xp+'/'+settings.target_xp+'\nOvershoot: '+settings.xp_overshoot);
	if (settings.target_xp>0 && settings.xp_overshoot > xptable_data[id].items[1])  xpcalc.find('.controls > .output').addClass('warn'); 
	else xpcalc.find('.controls > .output').removeClass('warn');
	
	if (settings.credit_price) xpcalc.find('.controls > .output > .total-credits > span').html(settings.total_credits.toLocaleString());
	
}
/* XP tables generic - end */
