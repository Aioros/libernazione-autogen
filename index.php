<?php
/*
Plugin Name: AutoGen
Plugin URI: http://www.aioros.net
Description: Allow users to create a generator that randomly combines groups of words or sentences.
Version: 0.1
Author: Stefano Morciano
Author URI: http://www.aioros.net
License: GPL2

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License, version 2, as 
published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

require_once('ag_functions.inc.php');

add_action('init', 'ag_register_type');
add_action('load-post.php', 'ag_post_meta_boxes_setup');
add_action('load-post-new.php', 'ag_post_meta_boxes_setup');

add_action( 'admin_print_scripts-post-new.php', 'ag_admin_script', 11 );
add_action( 'admin_print_scripts-post.php', 'ag_admin_script', 11 );

function ag_admin_script() {
    global $post_type;
    global $post;
    if ($post_type == "autogen" || stripos($post->post_title, "Generatore ") === 0) {
    	wp_enqueue_style("ag-admin-main", plugins_url('css/admin_main.css', __FILE__));
    	wp_enqueue_script("jsplumb", plugins_url('js/jsPlumb-2.1.0-min.js', __FILE__), array(
    		"jquery-ui-draggable",
    		"jquery-ui-droppable"
    	));
    	wp_enqueue_script("ag-scripts", plugins_url('js/autogen.js', __FILE__), array("jsplumb"));
    }
}

?>
