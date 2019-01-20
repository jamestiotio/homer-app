import 'angular-clock';
import 'angular-clock/dist/angular-clock.css';
import '../style/rsearch-widget.css';

import 'ace-builds/src-min-noconflict/ace' // Load Ace Editor
import 'ace-builds/src-min-noconflict/theme-chrome'
import 'ace-builds/src-min-noconflict/ext-language_tools'

import {cloneDeep} from 'lodash';

class RsearchWidget {
  constructor($scope, $state, UserProfile, $log, SearchService, $uibModal,
  CONFIGURATION, ModalHelper, ROUTER, TimeMachine) {
    'ngInject';
    this.$scope = $scope;
    this.$state = $state;
    this.UserProfile = UserProfile;
    this.$log = $log;
    this.SearchService = SearchService;
    this.$uibModal = $uibModal;
    this.CONFIGURATION = CONFIGURATION;
    this.ModalHelper = ModalHelper;
    this.ROUTER = ROUTER;
    this.TimeMachine = TimeMachine;
    
    $scope.aceOptions = {
        advanced:{
		maxLines: 1,
		minLines: 1,
		showLineNumbers: false,
	 	showGutter: false,
		fontSize: 13,
        	enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true,
                autoScrollEditorIntoView: true,
        },
        onLoad: function(editor, session){
        	var langTools = ace.require("ace/ext/language_tools");  
	
		var labelCompleter = {
     		   getCompletions: function(editor, session, pos, prefix, callback) {
	            //if (prefix.length === 0) { callback(null, []); return }

		    var api = "/api/v3/search/remote/label";
        	    $.getJSON( api,
		    function(wordList) {
                    	var labels = [];
	                    wordList.forEach(val => labels.push({word: val, score: 1 }))
        	            // console.log('got labels',labels);
	                    callback(null, labels.map(function(ea) {
        	                return {name: ea.word, value: ea.word, score: ea.score, meta: "label"}
                	    }));
	                })
        	    }
		};
		langTools.addCompleter(labelCompleter);		
		var allCompleters = editor.completers;

		var valueCompleter = {
     		   getCompletions: function(editor, session, pos, prefix, callback) {
		    var myprefix = "method";
	            if (prefix.length === 0) { 
	                console.log("NULL return ");
	                // callback(null, []); return 
	            }
	            else {
	                myprefix = prefix;
	            }

	            if (myprefix.length === 0) { callback(null, []); return }
		    var api = "/api/v3/search/remote/values?label="+myprefix;
        	    $.getJSON( api,
		    function(wordList) {
                    	var values = [];
	                    wordList.forEach(val => values.push({word: val, score: 1 }))
        	            // console.log('got values',values);
	                    callback(null, values.map(function(ea) {
        	                return {name: ea.word, value: '= "'+ea.word+'"', score: ea.score, meta: "value"}
                	    }));
	                })
        	    }
		};

	    	editor.commands.addCommand({
	                name: "getValues",
	                bindKey: { win: "=", mac: "=" },                
	                exec: function(editor,command) {
	                    console.log('Lookup values',editor.getValue(),command )
	                    if (!editor.completer) editor.completer = new Autocomplete(editor); 
	                    editor.completers = [valueCompleter];                  
	                    editor.execCommand("startAutocomplete");
	                    //editor.completer.showPopup(editor); 
	                }
	    	});   
    
	    
	    	editor.commands.on('afterExec', event => {
	    	   const { editor, command } = event;
	    	   // console.log('AFTER!',command)
	    	   if (event.command.name == "insertstring") {
	    	     editor.execCommand("startAutocomplete");
	    	     editor.completers = allCompleters; 
	    	   }
	    	   if (event.command.name == "insertMatch") {
			 editor.completers = allCompleters;
		   }
		});


		
        }
    }
  }

  $onInit() {
    this._widget = cloneDeep(this.widget);
    this.newObject = this.UserProfile.profileScope.search;
    this.newResult = this.UserProfile.profileScope.result;
    this.newResult.limit = this.newResult.limit || this.UserProfile.profileScope.limit;
    this.timerange = this.UserProfile.profileScope.timerange;                                         
    this.newObject['limit'] = 100;

    
  }
  
  aceChange() {
    console.log("CHANGE");
  }
  

  get locationName() {
    return this._widget.config.location.desc.toUpperCase() || 'unknown';
  }

  delete() {
    this.onDelete({uuid: this._widget.uuid});
  }

  update(widget) {
    this._widget = widget;
    console.log("WIDGTET", this._widget);
    this.onUpdate({uuid: this._widget.uuid, widget});
  }
  
  
  // process the form
  processSearchForm() {

    if (this.newObject instanceof Array) {
      this.newObject = {};
    }

    this.searchObject = {};
    this.nsObject = {};
    this.searchObject['searchvalue'] =  this.newObject['searchvalue'];
    //this.nsObject['query'] =  encodeURIComponent(encodeURIComponent(this.newObject['searchvalue']));    
    this.nsObject['query'] =  this.newObject['searchvalue'];    
    this.searchObject['limit'] =  this.newObject['limit'];

    this.UserProfile.setProfile('search', this.searchObject);
    this.UserProfile.setProfile('result', this.newResult);
    this.UserProfile.setProfile('limit', this.searchObject['limit']);
    this.isBusy = true;

        
    let protoID = 'loki';
    this.searchForProtocol(protoID);    

  }

  searchForProtocol(protoID) {
    const { from, to, custom } = this.TimeMachine.getTimerangeUnix();

    this.$state.go(this.ROUTER.REMOTE.NAME, {
      protoID,
      search: this.nsObject['query'],
      limit: this.searchObject['limit'],
      server: this._widget.server,
      timezone: this.TimeMachine.getTimezone(),
      from,
      to,
      custom,
    });    
  }


  clearSearchForm() {
    this.UserProfile.profileScope.search = {};
    this.UserProfile.setProfile('search', this.newObject);
    this._nullifyObjectKeys(this.newObject);
  }

  openSettings() {
    this.$uibModal.open({
      component: 'rsearchWidgetSettings',
      resolve: {
        widget: () => {
          return cloneDeep(this._widget);
        },
        timezones: () => {
          return this.TIMEZONES;
        },
      },
    }).result.then((widget) => {
      this.update(widget);
    }).catch((error) => {
      if (this.ModalHelper.isError(error)) {
        this.$log.error(['ResearchWidget', 'settings'], error);
      }
    });
  }
}

export default RsearchWidget;