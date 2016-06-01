jsPlumb.ready(function() {

	var $ = jQuery;
	jsp = jsPlumb.getInstance();
	var panState = {
	    elem: null,
	    x: 0,
	    y: 0,
	    state: false,
	    delta: {
		    x: 0,
		    y: 0
		}
	};

	var setZoomInternal = function(zoom, instance, transformOrigin, el) {
		if (zoom < 0.4 || zoom > 2)
			return;
		transformOrigin = transformOrigin || [ 0.5, 0.5 ];
		instance = instance || jsPlumb;
		el = el || instance.getContainer();
		var p = [ "webkit", "moz", "ms", "o" ],
			s = "scale(" + zoom + ")",
			oString = (transformOrigin[0] * 100) + "% " + (transformOrigin[1] * 100) + "%";

		for (var i = 0; i < p.length; i++) {
			el.style[p[i] + "Transform"] = s;
			el.style[p[i] + "TransformOrigin"] = oString;
		}

		el.style["transform"] = s;
		el.style["transformOrigin"] = oString;

		instance.setZoom(zoom);

		saveGraph(jsp);
	};

	var setZoom = function(zoom) {
		$("#zoom").val(zoom).trigger("change");
	}

	$("#zoom").on("change mousemove", function() {
		setZoomInternal($(this).val(), jsp);
	});

	var saveGraph = function(jsp) {
		var blocks = {};
		$("#graph-container .item").each(function (idx, elem) {
			var $elem = $(elem);
			blocks[$elem.attr('id')] = {
				id: $elem.attr('id'),
				x: parseInt($elem.css("left"), 10),
				y: parseInt($elem.css("top"), 10),
				content: $elem.find(".inner").html(),
				endpoint: $elem.hasClass("endpoint"),
				br: $elem.hasClass("br")
			};
		});
		var connections = [];
		$.each(jsp.getConnections(), function (idx, connection) {
			connections.push({
				connectionId: connection.id,
				color: connection.getData().color,
				sourceId: connection.sourceId,
				targetId: connection.targetId
			});
		});
		
		var graph = {};
		graph.blocks = blocks;
		graph.connections = connections;
		graph.zoom = jsp.getZoom();
		
		var graphJson = JSON.stringify(graph);
		
		$('#autogen_data').val(graphJson);
	}

	var loadGraph = function(jsp) {
		var graphJson = $('#autogen_data').val();
		var graph = JSON.parse(graphJson);
		var blocks = graph.blocks;
		$.each(blocks, function( index, elem ) {
			var type = "default";
			if (elem.endpoint)
				type = "endpoint";
			else if (elem.br)
				type = "br";
			addItem(elem.id, elem.x, elem.y, elem.content, type);
		});
								
		var connections = graph.connections;
		var connection;
		var options;
		$.each(connections, function( index, elem ) {
			var color = "none";
			switch (elem.color) {
				case "green":
					color = "rgba(0, 255, 0, 0.5)";
					break;
   				case "blue":
   					color = "rgba(0, 124, 255, 0.5)";
   					break;
   				case "yellow":
   					color = "rgba(214, 255, 0, 0.5)";
					break;
				case "pink":
    				color = "rgba(185, 0, 255, 0.5)";
					break;
				case "red":
    				color = "rgba(255, 32, 0, 0.5)";
					break;
    			case "orange":
    				color = "rgba(255, 132, 0, 0.5)";
					break;
			}
			options = {
				source: elem.sourceId,
				target: elem.targetId
			};
			if (color != "none") {
				options.paintStyle = $.extend({}, defaults.PaintStyle, {
						strokeStyle: color
				});
			}
			connection = jsp.connect(options);
			connection.setData({color: elem.color});
		});

		setZoom(graph.zoom);
	}

	var setEndpointsPosition = function(zoom) {
		if (typeof zoom === 'undefined')
			zoom = jsp.getZoom();
		$("#ag_start").css({
			top: 20,
			left: $("#main-container").outerWidth() / zoom / 2 - $("#ag_start").outerWidth() / zoom / 2
		});
		$("#ag_end").css({
			top: $("#main-container").outerHeight() / zoom - $("#ag_end").outerHeight() - 20,
			left: $("#main-container").outerWidth() / zoom / 2 - $("#ag_end").outerWidth() / zoom / 2
		});
		jsp.revalidate("ag_start");
		jsp.revalidate("ag_end");

		saveGraph(jsp);
	}

	var repositionElement = function(id, posX, posY) {
		$('#'+id).css('left', posX);
		$('#'+id).css('top', posY);
		jsp.revalidate(id);
	}

	var checkImage = function(item) {
		if (item.find(".img-sizer").length == 0) {
			var inner = item.find(".inner");
			if (inner.html().match(/^(https?:)?.*\.(jpeg|jpg|gif|png)$/)) {
				inner.html('<img src="' + inner.html() + '" />');
			}
			if (inner.html().match(/^<img [^>]*>$/)) {
				inner.find("img").load(function() {
					jsp.revalidate(item);
				});
				inner.off("dblclick");
				var imgWidth = inner.find("img").attr("width") ? inner.find("img").attr("width") : "";
				var imgSizer = $("<div>").addClass("img-sizer").html("Larghezza: ");
				var imgSizerInput = $("<input>").attr("type", "number");
				var size = parseInt(inner.find("img").css("width"));
				imgSizerInput.val(size > 0 ? size : "");
				imgSizer.append(imgSizerInput);
				item.append(imgSizer);
				jsp.revalidate(item);
			}
		}
	}

	$(document).on("change", ".img-sizer input", function() {
		$(this).closest(".item").find("img").css("width", $(this).val());
		jsp.revalidate($(this).closest(".item"));
	});
	$(document).on("keypress", ".img-sizer input", function() {
		return event.keyCode != 13;
	})

	var common = {
		filter: function(event, element) {
			if ($(event.target).closest(".item .inner").length == 0
				&& !$(event.target).hasClass("delete")
				&& $(event.target).closest(".item .img-sizer").length == 0) {
					return true;
			}
			return false;
		}
	};

	var addItem = function(id, x, y, content, type) {
		if (typeof content === "undefined")
			content = "";
		if (typeof x === "undefined" || typeof y === "undefined") {
			x = y = 0;
		}
		if (typeof type === "undefined")
			type = "default";

		var element = $("<div>");
		element
			.append($("<div>").addClass("inner"))
			.removeAttr("class")
			.addClass("item")
			.attr("id", id)
			.appendTo("#graph-container")
			.find(".inner").html(content);

		if (type != "default") {
			element.addClass(type);
		}
		if (type != "endpoint") {
			element.append($("<span>").addClass("delete").click(deleteItem));
		}

		jsp.draggable(element, { stop: function() { saveGraph(jsp) } });
		jsp.makeSource(element, common);
		jsp.makeTarget(element);

		element.dblclick(function() {
			jsp.setDraggable(this, false);
			var inner = $(this).find(".inner");
			inner.attr("contenteditable", true);
			inner.focus();
		});

		element.on("input", function() {
			jsp.revalidate(this);
			saveGraph(jsp);
		});

		element.focusout(function() {
			jsp.setDraggable(this, true);
			var inner = $(this).find(".inner");
			inner.attr("contenteditable", false);
			checkImage($(this));
			saveGraph(jsp);
		});

		checkImage(element);

		repositionElement(id, x, y);

		saveGraph(jsp);
	}

	var deleteItem = function() {
		jsp.remove($(this).closest(".item"));
		saveGraph(jsp);
	}

	var defaults = {
		Anchor: "AutoDefault",
		Connector: ["StateMachine", { cornerRadius: 4 }],
		Overlays: [ [ "PlainArrow", { location: 1, width: 14, length: 20 } ] ],
		PaintStyle: {
			lineWidth: 1,
			strokeStyle: '#777',
			outlineWidth: 5,
			outlineColor: "transparent"
		},
		HoverPaintStyle: {
			lineWidth: 2,
			strokeStyle: "rgba(0, 124, 255, 0.5)"
		},
		DragOptions: { cursor: "pointer" },
		Endpoint: [ "Dot", { radius: 4 } ],
		Endpoints: [ [ "Dot", { radius: 4 } ], [ "Dot", { radius: 4 } ] ],
		EndpointHoverStyles: [{ fillStyle: "rgba(0, 0, 200, 0.6)" }, { fillStyle: "rgba(0, 0, 200, 0.6)" }],
		MaxConnections: -1,
		ReattachConnections: false
	}

	jsp.importDefaults(defaults);

	jsp.setContainer("graph-container");

	if ($("#autogen_data").val() != "") {
		loadGraph(jsp);
	} else {
		addItem("ag_start", 0, 0, "Inizio", "endpoint");
		addItem("ag_end", 0, 0, "Fine", "endpoint");
		setEndpointsPosition(jsp.getZoom());
	}

	$(".item.placeholder").draggable({
		helper: "clone",
		cursor: "move",
		tolerance: "fit",
		revert: true
	});

	$("#main-container").droppable({
		accept: ".placeholder",
		hoverClass: "ui-state-hover",
		activeClass: "ui-state-active",
		drop: function(e, ui) {
			var containerOffsetX = $("#graph-container").offset().left - $("#main-container").offset().left;
			var containerOffsetY = $("#graph-container").offset().top - $("#main-container").offset().top;
			var x = parseInt(ui.helper.css("left"), 10) - containerOffsetX;
			var y = parseInt(ui.helper.css("top"), 10) - containerOffsetY - 40;
			var type = "default";
			if (ui.helper.hasClass("br"))
				type = "br";
			addItem("ag_" + new Date().getTime(), x / jsp.getZoom(), y / jsp.getZoom(), "", type);
			ui.helper.remove();
		}
	});

	$("#main-container").on("wheel", function(ev) {
		ev.preventDefault();
		if (ev.originalEvent.deltaY > 0) {
			//scroll down, zoom out
			setZoom(parseFloat(jsp.getZoom()) - 0.1);
		} else {
			//scroll up, zoom in
			setZoom(parseFloat(jsp.getZoom()) + 0.1);
		}
	});

	$("#main-container").mousedown(function(ev) {
		if (!panState.state && ev.which == 1) {
			panState.elem = $("#graph-container");
			panState.x = ev.pageX;
			panState.y = ev.pageY;
			panState.state = true;
			$("#main-container").addClass("panning");
		}
	});

	$("#main-container").mousemove(function(ev) {
		if (panState.state) {
			panState.delta.x = ev.pageX - panState.x;
			panState.delta.y = ev.pageY - panState.y;
			var curOffset = $(panState.elem).offset();
			$(panState.elem).offset({
				left: curOffset.left + panState.delta.x,
				top: curOffset.top + panState.delta.y
			});
			panState.x = ev.pageX;
			panState.y = ev.pageY;
		}
	});

	$(document).mouseup(function() {
	    if (panState.state) {
	        panState.state = false;
	        $("#main-container").removeClass("panning");
	    }
	});

	jsp.bind("connection", function() {
		saveGraph(jsp);
	});
	jsp.bind("connectionDetached", function() {
		saveGraph(jsp);
	});
	jsp.bind("connectionMoved", function() {
		saveGraph(jsp);
	});

	jsp.bind("click", function(connection, ev) {
		connection.addOverlay(["Custom", { create: function(component) {
			var palette = $("#ag_choice_palette_container").clone().removeAttr("id");
			palette.find(".color").click(function() {
				var colorName = $(this).attr("data-color");
				var color;
				if (colorName != "none") {
					color = $(this).css("background-color");
					connection.setPaintStyle($.extend({}, defaults.PaintStyle, {
						strokeStyle: color
					}));
					connection.setData({color: colorName});
				} else {
					connection.setPaintStyle($.extend({}, defaults.PaintStyle, {
						strokeStyle: "#777"
					}));
					connection.setData({});
				}
				connection.removeOverlay("palette_overlay");
				connection.setHover(false);
				saveGraph(jsp);
			});
			palette.find(".delete").click(function() {
				connection.removeOverlay("palette_overlay");
				connection.setHover(false);
			});
			return palette.show();
		}, location: 0.5, id: "palette_overlay"}]);

	});

	$(".full-screen").click(function() {
		$("#ag_overlay").toggleClass("full");
		jsp.repaintEverything();
	});

});

