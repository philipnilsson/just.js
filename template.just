
var tmpl =
 <div>
   <h1 class="header">  @header </>
   <h2 class="header2"> @header2 </>
   <h3 class="header3"> @header3 </>
   <h4 class="header4"> @header4 </>
   <h5 class="header5"> @header5 </>
   <h6 class="header6"> @header6 </>
   <ul :by="@list">
      <repeat>
        <li> @ </>
      </>
   </>
 </>;

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
