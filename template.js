
var tmpl =
 just.div({})(just.h1({"class":["header"]})(function(){return this.header}," "),just.h2({"class":["header2"]})(function(){return this.header2}," "),just.h3({"class":["header3"]})(function(){return this.header3}," "),just.h4({"class":["header4"]})(function(){return this.header4}," "),just.h5({"class":["header5"]})(function(){return this.header5}," "),just.h6({"class":["header6"]})(function(){return this.header6}," "),just.ul({})(just.repeat({})(just.li({})(function(){return this}," "))).by(function(){return this.list}));

// var fullName = 
//   <span class="fullname">
//     <span> @firstName </>
//     <span> @lastName </>
//   </>;

// var table = function(name) {
//    return <div id="${name}s-container}">
//        <table class="${name}-table">
//          <repeat>
//            <tr> 
//              <repeat>
//                <td> @lastName, @firstName </>
//              </>
//            </>
//          </>
//        </>
//      </div>
// }

// var contactsTable = table('contact')
// var priceTable    = table('price')

// var contact = function(klass) {
//   return <div>
//     <span class="$klass-contact"> Name: $fullName, </> 
//     <span class="phone-number"> Phone number: @number. </>
//   </>;
// }

// var contacts = 
//   <div id="contacts"> 
//     <repeat> 
//       ${contact('foo')}
//     </>
//   </>;

