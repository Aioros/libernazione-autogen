<?php 
if ( !defined('ABSPATH') ) define('ABSPATH', dirname(__FILE__));
require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

$plugindir = plugin_dir_url(__FILE__);

function walk_graph($graph) {
	$output = "";
	$cur_block = "ag_start";
	$past_choices = array();
	$quoting = false;

	while ($cur_block != "ag_end") {

		if ($cur_block != "ag_start") {
			if (isset($graph->blocks->{$cur_block}->br) && $graph->blocks->{$cur_block}->br)
				$content = "<br>";
			else
				$content = $graph->blocks->{$cur_block}->content;
			$force_connect = ($content[0] == "_");
			if ($force_connect)
				$content = substr($content, 1);
			if (
				$output != ""
				&& preg_match("/^\w/u", $content)
				&& !preg_match("/-$/", $output)
				&& !preg_match("/\s$/u", $output) && !preg_match("/^\s/u", $content)
				&& !$force_connect
				|| (!$quoting && preg_match("/^[\"]/u", $content))
			)
				$content = " " . $content;
			if (substr_count($content, "\"") % 2 != 0) {
				if ($quoting)
					$quoting = false;
				else
					$quoting = true;
			}
			$output .= $content;
		}
		$cur_choices = array();
		$valid_choices = array();
		
		foreach ($graph->connections as $connection) {
			$color = $connection->color != "" ? $connection->color : "none";
			if ($connection->sourceId == $cur_block) {
				$cur_choices[$color][] = $connection;
			}
		}
		
		foreach ($cur_choices as $color => $choices) {
			if (isset($past_choices[$color])) {
				$valid_choices = $choices;
				break;
			} else {
				$valid_choices = array_merge($valid_choices, $choices);
			}
		}

		if (!empty($valid_choices)) {
			$choice_index = array_rand($valid_choices);
			$choice = $valid_choices[$choice_index];
			if ($choice->color != "")
				$past_choices[$choice->color] = $choice;
			$cur_block = $choice->targetId;
		} else {
			$cur_block = "ag_end";
		}
	}

	return $output;
}

add_filter('the_content', 'autogen_content');
function autogen_content($content) {
    global $post;
    if ($post->post_type != "autogen" && stripos($post->post_title, "Generatore ") !== 0)
        return $content;
	$graph = json_decode(get_post_meta( $post->ID, 'autogen_data', true ));
    $autogen_content = $content . '<span class="autogen" style="font-size: 25pt; line-height: 30pt;">' . walk_graph($graph) . '</span>';
    return $autogen_content;
}

function ag_register_type() {
	register_post_type("autogen", array(
		'label' => "AutoGen",
		'public' => true,
		'publicly_queryable' => true,
		'show_ui' => true,
		'query_var' => true,
		'rewrite' => array( 'slug' => 'autogen' ),
		'capability_type' => 'post',
		'has_archive' => true, 
		'hierarchical' => false,
		'menu_position' => null,
		'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'comments' )
	));
	register_taxonomy_for_object_type( "category", "autogen" );
	register_taxonomy_for_object_type( "post_tag", "autogen" );
}

function ag_post_meta_boxes_setup() {
	add_action( 'add_meta_boxes', 'ag_add_meta_boxes' );
	add_action( 'save_post', 'ag_save_data_meta', 10, 2 );
}

function ag_add_meta_boxes() {
	global $post;
	if ($post->post_type == "autogen" || stripos($post->post_title, "Generatore ") === 0) {
		add_meta_box(
			'autogen-data',
			"Composer",
			'ag_data_meta_box',   // Callback function
			null,         // Admin page (or post type)
			'normal',         // Context
			'high'         // Priority
		);
	}
}

function ag_data_meta_box($object, $box) { ?>
	<div id="ag_overlay">
		<div id="full_container">
			<span class="full-screen"></span>
			<div class="placeholder item draggable"><div class="inner">Trascina un nuovo elemento</div></div>
			<div class="placeholder item draggable br"><div class="inner"></div></div>
			<div id="zoom_control">
				<label for="zoom">Zoom</label><input id="zoom" name="zoom" type="range" min="0.4" max="1.6" step="0.1" value="1" />
			</div>
			<div class="clearfix"></div>
			<div id="main-container">
				<div id="graph-container"></div>
			</div>
			<div id="ag_choice_palette_container">
				<div class="ag-choice-palette">
					<span class="delete"></span>
					<span class="used-label">Associa a:</span>
					<div class="used"></div>
					<span class="available-label">Assegna:</span>
					<div class="available">
						<div class="color none" data-color="none"></div>
						<div class="color green" data-color="green"></div>
						<div class="color blue" data-color="blue"></div>
						<div class="color yellow" data-color="yellow"></div>
						<div class="color pink" data-color="pink"></div>
						<div class="color red" data-color="red"></div>
						<div class="color orange" data-color="orange"></div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<?php wp_nonce_field( basename( __FILE__ ), 'autogen_data_nonce' ); ?>
	<input type="text" name="autogen_data" id="autogen_data" value="<?php echo esc_attr( get_post_meta( $object->ID, 'autogen_data', true ) ); ?>" />
	<?php 
}

function ag_save_data_meta($post_id, $post) {
	if ( !isset( $_POST['autogen_data_nonce'] ) || !wp_verify_nonce( $_POST['autogen_data_nonce'], basename( __FILE__ ) ) )
		return $post_id;
	$post_type = get_post_type_object( $post->post_type );
	if ( !current_user_can( $post_type->cap->edit_post, $post_id ) )
		return $post_id;
	$new_meta_value = ( isset( $_POST['autogen_data'] ) ? $_POST['autogen_data'] : '' );
	$meta_key = 'autogen_data';
	$meta_value = get_post_meta( $post_id, $meta_key, true );

	if ($new_meta_value != "")
		update_post_meta( $post_id, $meta_key, $new_meta_value );
	elseif ( '' == $new_meta_value && $meta_value )
		delete_post_meta( $post_id, $meta_key, $meta_value );
}
